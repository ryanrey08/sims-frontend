import { getReportForm } from "@/config/reportForms";

import type { FieldValue, MasterRecord, ReportColumn, ReportTable } from "@/types/records";
import { getDb } from "../database/db";
import { enrichDocument, referenceLabel } from "./records";
import { enrichMovement, enrichProduct, enrichStockLevel, enrichPurchaseOrder, productTotals } from "./relations";
import { notFound, round, validationFailed, type MockRoute } from "./utils";

type Row = Record<string, FieldValue>;
type Query = Record<string, string>;

const INBOUND = new Set(["receipt", "adjustment-in", "transfer-in"]);
const col = (key: string, label: string, format?: ReportColumn["format"], align?: ReportColumn["align"]): ReportColumn => ({
  key,
  label,
  format,
  align: align ?? (format === "currency" || format === "number" ? "right" : "left"),
});
const day = (iso: string) => iso.slice(0, 10);
const inRange = (date: string, query: Query) => (!query.from || day(date) >= query.from) && (!query.to || day(date) <= query.to);
const sum = (rows: Row[], key: string) => rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

function signatories(prepared = "Supply Officer"): ReportTable["signatories"] {
  return [
    { label: "Prepared by", name: "Liza Mercado", position: prepared },
    { label: "Certified correct", name: "Roberto Aquino", position: "Inventory Manager" },
    { label: "Approved by", name: "Andrea Villanueva", position: "Head of Agency" },
  ];
}

function postedDocs(type: string, query: Query) {
  return getDb()
    .documents.filter((doc) => doc.type === type && doc.status === "posted" && inRange(doc.date, query))
    .filter((doc) => !query.warehouseId || doc.fields.warehouseId === query.warehouseId)
    .map(enrichDocument);
}

function propertyRows(filter: (record: MasterRecord) => boolean) {
  const db = getDb();
  return (db.masters.properties ?? []).filter(filter).map((property) => ({
    propertyNo: property.propertyNo as string,
    description: property.description as string,
    classification: referenceLabel("property-classifications", property.classificationId) ?? "",
    acquisitionDate: property.acquisitionDate as string,
    cost: Number(property.acquisitionCost),
    accountable: referenceLabel("employees", property.accountableId) ?? "—",
    condition: property.condition as string,
    status: property.status as string,
  }));
}

const BUILDERS: Record<string, (query: Query) => Omit<ReportTable, "code" | "title">> = {
  iar: (query) => {
    const rows = postedDocs("receiving", query)
      .filter((doc) => !query.supplierId || doc.fields.supplierId === query.supplierId)
      .flatMap((doc) =>
        doc.items.map((item) => ({ date: doc.date, number: doc.number, supplier: doc.labels?.supplierId ?? "", poNumber: String(doc.fields.poNumber ?? ""), item: item.description ?? "", unit: item.unit ?? "", quantity: item.quantity, amount: item.quantity * (item.unitCost ?? 0) })),
      );
    return {
      columns: [col("date", "Date", "date"), col("number", "GRN No."), col("supplier", "Supplier"), col("poNumber", "PO No."), col("item", "Item"), col("unit", "Unit"), col("quantity", "Qty Accepted", "number"), col("amount", "Amount", "currency")],
      rows,
      totals: { quantity: sum(rows, "quantity"), amount: sum(rows, "amount") },
      signatories: signatories("Inspection Officer"),
    };
  },
  raaf: (query) => {
    const docs = getDb().documents.filter((doc) => inRange(doc.date, query) && doc.status !== "draft");
    const byType = new Map<string, string[]>();
    docs.forEach((doc) => byType.set(doc.number.split("-")[0], [...(byType.get(doc.number.split("-")[0]) ?? []), doc.number]));
    const rows = [...byType.entries()].map(([prefix, numbers]) => {
      const sorted = numbers.sort();
      return { form: prefix, from: sorted[0], to: sorted[sorted.length - 1], issued: sorted.length, cancelled: docs.filter((doc) => doc.number.startsWith(prefix) && doc.status === "cancelled").length };
    });
    return { columns: [col("form", "Accountable Form"), col("from", "Serial From"), col("to", "Serial To"), col("issued", "Issued", "number"), col("cancelled", "Cancelled", "number")], rows, signatories: signatories() };
  },
  "supplier-ledger": (query) => {
    const db = getDb();
    const supplier = db.suppliers.find((item) => item.id === query.supplierId) ?? notFound("Supplier");
    let balance = 0;
    const rows = db.purchaseOrders
      .filter((order) => order.supplierId === supplier.id && order.status !== "draft" && order.status !== "cancelled" && inRange(order.orderDate, query))
      .sort((a, b) => a.orderDate.localeCompare(b.orderDate))
      .map(enrichPurchaseOrder)
      .map((order) => {
        const delivered = order.items.reduce((total, item) => total + item.receivedQuantity * item.unitCost, 0);
        balance += (order.total ?? 0) - delivered;
        return { date: order.orderDate, reference: order.poNumber, ordered: order.total ?? 0, delivered, balance, status: order.status };
      });
    return {
      subtitle: supplier.name,
      meta: [{ label: "Supplier", value: supplier.name }, { label: "TIN", value: supplier.tin ?? "—" }, { label: "Terms", value: supplier.paymentTerms }],
      columns: [col("date", "Date", "date"), col("reference", "Reference"), col("ordered", "Ordered", "currency"), col("delivered", "Delivered", "currency"), col("balance", "Undelivered Balance", "currency"), col("status", "Status", "status")],
      rows,
      totals: { ordered: sum(rows, "ordered"), delivered: sum(rows, "delivered") },
    };
  },
  "stock-card": (query) => {
    const db = getDb();
    const product = db.products.find((item) => item.id === query.productId) ?? notFound("Item");
    let balance = 0;
    const rows = db.movements
      .filter((movement) => movement.productId === product.id && (!query.warehouseId || movement.warehouseId === query.warehouseId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((movement) => {
        const inbound = INBOUND.has(movement.type);
        balance += inbound ? movement.quantity : -movement.quantity;
        return { date: movement.createdAt, reference: movement.reference, receipt: inbound ? movement.quantity : null, issue: inbound ? null : movement.quantity, office: movement.reason, balance };
      });
    return {
      subtitle: `${product.sku} – ${product.name}`,
      meta: [{ label: "Item", value: product.name }, { label: "Stock No.", value: product.sku }, { label: "Unit", value: product.unit }, { label: "Re-order Point", value: String(product.reorderLevel) }, { label: "Warehouse", value: referenceLabel("warehouses", query.warehouseId) ?? "All warehouses" }],
      columns: [col("date", "Date", "date"), col("reference", "Reference"), col("receipt", "Receipt Qty", "number"), col("issue", "Issue Qty", "number"), col("office", "Office / Remarks"), col("balance", "Balance Qty", "number")],
      rows,
    };
  },
  "inventory-ledger": (query) => {
    const db = getDb();
    const product = db.products.find((item) => item.id === query.productId) ?? notFound("Item");
    let quantity = 0;
    const rows = db.movements
      .filter((movement) => movement.productId === product.id && (!query.warehouseId || movement.warehouseId === query.warehouseId))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((movement) => {
        const inbound = INBOUND.has(movement.type);
        quantity += inbound ? movement.quantity : -movement.quantity;
        const amount = movement.quantity * movement.unitCost;
        return { date: movement.createdAt, reference: movement.reference, inQty: inbound ? movement.quantity : null, inAmount: inbound ? amount : null, outQty: inbound ? null : movement.quantity, outAmount: inbound ? null : amount, balanceQty: quantity, balanceAmount: quantity * movement.unitCost };
      });
    return {
      subtitle: `${product.sku} – ${product.name}`,
      meta: [{ label: "Item", value: product.name }, { label: "Unit Cost", value: `₱${product.unitCost.toFixed(2)}` }],
      columns: [col("date", "Date", "date"), col("reference", "Reference"), col("inQty", "In Qty", "number"), col("inAmount", "In Amount", "currency"), col("outQty", "Out Qty", "number"), col("outAmount", "Out Amount", "currency"), col("balanceQty", "Bal. Qty", "number"), col("balanceAmount", "Bal. Amount", "currency")],
      rows,
    };
  },
  ics: (query) => {
    const rows = propertyRows((record) => String(record.propertyNo).startsWith("SE") && Boolean(record.accountableId) && (!query.employeeId || record.accountableId === query.employeeId));
    return { columns: [col("propertyNo", "Inventory Item No."), col("description", "Description"), col("cost", "Unit Cost", "currency"), col("accountable", "Received by"), col("acquisitionDate", "Date Acquired", "date"), col("condition", "Condition")], rows, totals: { cost: sum(rows, "cost") }, signatories: signatories("Property Custodian") };
  },
  ris: (query) => {
    const rows = postedDocs("issuances", query).flatMap((doc) => doc.items.map((item) => ({ date: doc.date, number: doc.number, office: String(doc.fields.office ?? ""), stockNo: item.code ?? "", item: item.description ?? "", unit: item.unit ?? "", quantity: item.quantity, purpose: String(doc.fields.purpose ?? "") })));
    return { columns: [col("date", "Date", "date"), col("number", "RIS No."), col("office", "Office"), col("stockNo", "Stock No."), col("item", "Description"), col("unit", "Unit"), col("quantity", "Qty Issued", "number"), col("purpose", "Purpose")], rows, totals: { quantity: sum(rows, "quantity") }, signatories: signatories() };
  },
  rsmi: (query) => {
    const movements = getDb().movements.filter((movement) => movement.type === "issue" && inRange(movement.createdAt, query) && (!query.warehouseId || movement.warehouseId === query.warehouseId)).map(enrichMovement);
    const byItem = new Map<string, Row>();
    movements.forEach((movement) => {
      const row = byItem.get(movement.productId) ?? { stockNo: movement.sku ?? "", item: movement.productName ?? "", unit: movement.unit ?? "", quantity: 0, unitCost: movement.unitCost, amount: 0 };
      row.quantity = Number(row.quantity) + movement.quantity;
      row.amount = Number(row.amount) + movement.quantity * movement.unitCost;
      byItem.set(movement.productId, row);
    });
    const rows = [...byItem.values()].sort((a, b) => String(a.stockNo).localeCompare(String(b.stockNo)));
    return { columns: [col("stockNo", "Stock No."), col("item", "Item"), col("unit", "Unit"), col("quantity", "Qty Issued", "number"), col("unitCost", "Unit Cost", "currency"), col("amount", "Amount", "currency")], rows, totals: { quantity: sum(rows, "quantity"), amount: sum(rows, "amount") }, signatories: signatories() };
  },
  wmr: (query) => {
    const rows = getDb()
      .movements.filter((movement) => movement.type === "adjustment-out" && /damag|expir|waste/i.test(movement.reason) && inRange(movement.createdAt, query) && (!query.warehouseId || movement.warehouseId === query.warehouseId))
      .map(enrichMovement)
      .map((movement) => ({ date: movement.createdAt, item: movement.productName ?? "", unit: movement.unit ?? "", quantity: movement.quantity, amount: movement.quantity * movement.unitCost, reason: movement.reason, reference: movement.reference }));
    return { columns: [col("date", "Date", "date"), col("reference", "Reference"), col("item", "Item"), col("unit", "Unit"), col("quantity", "Qty", "number"), col("amount", "Amount", "currency"), col("reason", "Reason")], rows, totals: { quantity: sum(rows, "quantity"), amount: sum(rows, "amount") }, signatories: signatories() };
  },
  rpci: (query) => {
    const db = getDb();
    const rows = db.products
      .filter((product) => product.status === "active")
      .map((product) => {
        const onCard = productTotals(product.id, query.warehouseId || undefined);
        const counted = db.documents
          .filter((doc) => doc.type === "physical-counts" && doc.status === "posted" && (!query.warehouseId || doc.fields.warehouseId === query.warehouseId))
          .flatMap((doc) => doc.items)
          .filter((item) => item.refId === product.id)
          .pop()?.countedQty;
        const onHand = counted ?? onCard;
        return { stockNo: product.sku, item: product.name, unit: product.unit, unitValue: product.unitCost, balancePerCard: onCard, onHand, shortage: onHand - onCard, value: onHand * product.unitCost };
      });
    return { meta: [{ label: "Warehouse", value: referenceLabel("warehouses", query.warehouseId) ?? "All warehouses" }], columns: [col("stockNo", "Stock No."), col("item", "Article / Description"), col("unit", "Unit"), col("unitValue", "Unit Value", "currency"), col("balancePerCard", "Balance per Card", "number"), col("onHand", "On Hand per Count", "number"), col("shortage", "Shortage / Overage", "number"), col("value", "Total Value", "currency")], rows, totals: { value: sum(rows, "value") }, signatories: signatories("Inventory Committee") };
  },
  "low-stock": (query) => {
    const rows = getDb()
      .products.filter((product) => product.status === "active")
      .map((product) => enrichProduct(product, query.warehouseId || undefined))
      .filter((product) => product.stockStatus !== "in-stock")
      .map((product) => ({ sku: product.sku, item: product.name, onHand: product.totalStock ?? 0, reorderLevel: product.reorderLevel, unit: product.unit, status: product.stockStatus ?? "" }));
    return { columns: [col("sku", "SKU"), col("item", "Item"), col("onHand", "On Hand", "number"), col("reorderLevel", "Reorder Level", "number"), col("unit", "Unit"), col("status", "Status", "status")], rows };
  },
  reorder: (query) => {
    const rows = getDb()
      .products.filter((product) => product.status === "active")
      .map((product) => enrichProduct(product, query.warehouseId || undefined))
      .filter((product) => (product.totalStock ?? 0) <= product.reorderLevel * 1.5)
      .map((product) => ({ sku: product.sku, item: product.name, onHand: product.totalStock ?? 0, reorderLevel: product.reorderLevel, suggested: Math.max(product.reorderQuantity, product.reorderLevel * 2 - (product.totalStock ?? 0)), supplier: product.supplierName ?? "—", cost: product.unitCost * Math.max(product.reorderQuantity, product.reorderLevel * 2 - (product.totalStock ?? 0)) }));
    return { columns: [col("sku", "SKU"), col("item", "Item"), col("onHand", "On Hand", "number"), col("reorderLevel", "Reorder Level", "number"), col("suggested", "Suggested Order", "number"), col("supplier", "Preferred Supplier"), col("cost", "Est. Cost", "currency")], rows, totals: { cost: sum(rows, "cost") } };
  },
  valuation: (query) => {
    const rows = getDb()
      .stockLevels.filter((level) => level.quantity > 0 && (!query.warehouseId || level.warehouseId === query.warehouseId))
      .map(enrichStockLevel)
      .map((level) => ({ sku: level.sku ?? "", item: level.productName ?? "", warehouse: level.warehouseName ?? "", quantity: level.quantity, unitCost: level.unitCost ?? 0, value: level.value ?? 0 }))
      .sort((a, b) => b.value - a.value);
    return { columns: [col("sku", "SKU"), col("item", "Item"), col("warehouse", "Warehouse"), col("quantity", "Qty", "number"), col("unitCost", "Unit Cost", "currency"), col("value", "Value", "currency")], rows, totals: { quantity: sum(rows, "quantity"), value: sum(rows, "value") } };
  },
  "stock-aging": (query) => {
    const db = getDb();
    const now = Date.now();
    const rows = db.stockLevels
      .filter((level) => level.quantity > 0 && (!query.warehouseId || level.warehouseId === query.warehouseId))
      .map((level) => {
        const last = db.movements.filter((movement) => movement.productId === level.productId && movement.warehouseId === level.warehouseId).map((movement) => movement.createdAt).sort().pop();
        const days = last ? Math.floor((now - new Date(last).getTime()) / 86400000) : 999;
        const enriched = enrichStockLevel(level);
        return { item: enriched.productName ?? "", warehouse: enriched.warehouseName ?? "", quantity: level.quantity, lastMovement: last ?? null, days, bucket: days <= 30 ? "0–30 days" : days <= 60 ? "31–60 days" : days <= 90 ? "61–90 days" : "Over 90 days" };
      })
      .sort((a, b) => b.days - a.days);
    return { columns: [col("item", "Item"), col("warehouse", "Warehouse"), col("quantity", "Qty", "number"), col("lastMovement", "Last Movement", "date"), col("days", "Days Idle", "number"), col("bucket", "Aging Bucket")], rows };
  },
  "movement-history": (query) => {
    const rows = getDb()
      .movements.filter((movement) => inRange(movement.createdAt, query) && (!query.warehouseId || movement.warehouseId === query.warehouseId) && (!query.productId || movement.productId === query.productId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 500)
      .map(enrichMovement)
      .map((movement) => ({ date: movement.createdAt, reference: movement.reference, item: movement.productName ?? "", warehouse: movement.warehouseName ?? "", type: movement.type, quantity: INBOUND.has(movement.type) ? movement.quantity : -movement.quantity, balance: movement.balanceAfter, by: movement.performedBy }));
    return { columns: [col("date", "Date", "datetime"), col("reference", "Reference"), col("item", "Item"), col("warehouse", "Warehouse"), col("type", "Type", "status"), col("quantity", "Qty", "number"), col("balance", "Balance", "number"), col("by", "By")], rows };
  },
  "property-card": (query) => {
    const db = getDb();
    const property = db.masters.properties?.find((item) => item.id === query.propertyId) ?? notFound("Property");
    const rows: Row[] = [{ date: String(property.acquisitionDate), reference: "Acquisition", event: "Received / registered", officer: "—", amount: Number(property.acquisitionCost) }];
    db.documents
      .filter((doc) => doc.status === "posted" && doc.type.startsWith("property-") && doc.items.some((item) => item.refId === property.id))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(enrichDocument)
      .forEach((doc) => rows.push({ date: doc.date, reference: doc.number, event: doc.type.replace("property-", "").replace(/s$/, ""), officer: doc.labels?.employeeId ?? doc.labels?.toEmployeeId ?? "—", amount: Number(property.acquisitionCost) }));
    return {
      subtitle: `${property.propertyNo} – ${property.description}`,
      meta: [{ label: "Property No.", value: String(property.propertyNo) }, { label: "Description", value: String(property.description) }, { label: "Classification", value: referenceLabel("property-classifications", property.classificationId) ?? "" }, { label: "Accountable Officer", value: referenceLabel("employees", property.accountableId) ?? "—" }],
      columns: [col("date", "Date", "date"), col("reference", "Reference"), col("event", "Transaction"), col("officer", "Officer"), col("amount", "Amount", "currency")],
      rows,
    };
  },
  par: (query) => {
    const rows = propertyRows((record) => String(record.propertyNo).startsWith("PPE") && Boolean(record.accountableId) && (!query.employeeId || record.accountableId === query.employeeId));
    return { columns: [col("propertyNo", "Property No."), col("description", "Description"), col("acquisitionDate", "Date Acquired", "date"), col("cost", "Amount", "currency"), col("accountable", "Received by")], rows, totals: { cost: sum(rows, "cost") }, signatories: signatories("Property Custodian") };
  },
  rpcppe: () => {
    const rows = propertyRows((record) => record.status !== "disposed").map((row) => ({ ...row, onHand: row.status === "lost" ? 0 : 1, shortage: row.status === "lost" ? -1 : 0 }));
    return { columns: [col("propertyNo", "Property No."), col("description", "Description"), col("classification", "Classification"), col("cost", "Unit Value", "currency"), col("onHand", "On Hand", "number"), col("shortage", "Shortage", "number"), col("accountable", "Accountable Officer"), col("condition", "Remarks")], rows, totals: { cost: sum(rows, "cost") }, signatories: signatories("Inventory Committee") };
  },
  iirup: () => {
    const rows = propertyRows((record) => record.condition === "Unserviceable" || record.status === "for-disposal" || record.status === "disposed");
    return { columns: [col("propertyNo", "Property No."), col("description", "Particulars"), col("acquisitionDate", "Date Acquired", "date"), col("cost", "Total Cost", "currency"), col("condition", "Condition"), col("status", "Disposal Status", "status")], rows, totals: { cost: sum(rows, "cost") }, signatories: signatories("Inspection Committee") };
  },
  rlsddp: () => {
    const rows = propertyRows((record) => record.status === "lost");
    return { columns: [col("propertyNo", "Property No."), col("description", "Description"), col("acquisitionDate", "Date Acquired", "date"), col("cost", "Acquisition Cost", "currency"), col("accountable", "Last Accountable Officer"), col("status", "Status", "status")], rows, totals: { cost: sum(rows, "cost") }, signatories: signatories("Property Custodian") };
  },
  ptr: (query) => {
    const rows = getDb()
      .documents.filter((doc) => doc.type === "property-transfers" && doc.status === "posted" && inRange(doc.date, query))
      .map(enrichDocument)
      .flatMap((doc) => doc.items.map((item) => ({ date: doc.date, number: doc.number, propertyNo: item.code ?? "", description: item.description ?? "", from: doc.labels?.fromEmployeeId ?? "", to: doc.labels?.toEmployeeId ?? "", amount: item.unitCost ?? 0 })));
    return { columns: [col("date", "Date", "date"), col("number", "PTR No."), col("propertyNo", "Property No."), col("description", "Description"), col("from", "From"), col("to", "To"), col("amount", "Amount", "currency")], rows, signatories: signatories("Property Custodian") };
  },
  "ppe-ledger": (query) => {
    const db = getDb();
    const property = db.masters.properties?.find((item) => item.id === query.propertyId) ?? notFound("Property");
    const classification = db.masters["property-classifications"]?.find((item) => item.id === property.classificationId);
    const cost = Number(property.acquisitionCost);
    const life = Number(classification?.usefulLife ?? 5);
    const residual = round((cost * Number(classification?.residualRate ?? 10)) / 100, 2);
    const annual = round((cost - residual) / life, 2);
    const start = new Date(String(property.acquisitionDate)).getFullYear();
    let accumulated = 0;
    const rows = Array.from({ length: life }, (_, index) => {
      accumulated = round(accumulated + annual, 2);
      return { year: String(start + index + 1), depreciation: annual, accumulated, bookValue: round(cost - accumulated, 2) };
    });
    return {
      subtitle: `${property.propertyNo} – ${property.description}`,
      meta: [{ label: "Acquisition Cost", value: `₱${cost.toLocaleString("en-PH")}` }, { label: "Useful Life", value: `${life} years` }, { label: "Residual Value", value: `₱${residual.toLocaleString("en-PH")}` }, { label: "Method", value: "Straight-line" }],
      columns: [col("year", "Year"), col("depreciation", "Depreciation", "currency"), col("accumulated", "Accumulated Depreciation", "currency"), col("bookValue", "Book Value", "currency")],
      rows,
    };
  },
  "audit-trail": (query) => {
    const rows = getDb()
      .activities.filter((activity) => inRange(activity.createdAt, query))
      .map((activity) => ({ date: activity.createdAt, user: activity.actor, module: activity.module, action: activity.action, target: activity.target }));
    return { columns: [col("date", "Date & Time", "datetime"), col("user", "User"), col("module", "Module"), col("action", "Action"), col("target", "Record")], rows };
  },
};

export const formRoutes: MockRoute[] = [
  {
    method: "GET",
    pattern: "/reports/forms/:code",
    handler: ({ params, query }): ReportTable => {
      const def = getReportForm(params.code) ?? notFound("Report");
      const missing = (def.required ?? []).filter((key) => !query[key]);
      if (missing.length) validationFailed(Object.fromEntries(missing.map((key) => [key, ["Select a value to generate this report."]])));
      const built = BUILDERS[def.code](query);
      return { code: def.code, title: def.title, ...built };
    },
  },
];
