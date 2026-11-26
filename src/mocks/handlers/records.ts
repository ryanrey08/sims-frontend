import { displayStatus, documentPrefix, getDocumentDef, type DocumentDef } from "@/config/documents";
import { getMasterData, type FieldDef } from "@/config/masterData";
import type { DocumentItem, MasterRecord, TransactionDocument } from "@/types/records";
import { getDb, newId, nowISO, persistDb } from "../database/db";
import { logActivityEntry } from "./activity";
import { actorName, postMovement, productTotals } from "./relations";
import {
  bodyOf,
  conflict,
  listResponse,
  matchesSearch,
  MockHttpError,
  notFound,
  requirePermission,
  validationFailed,
  type MockRequest,
  type MockRoute,
} from "./utils";

// Shared lookups ---------------------------------------------------------------------

/** Display label for a value of a reference field (warehouse, supplier, employee, master record). */
export function referenceLabel(source: string | undefined, value: unknown): string | undefined {
  if (!source || value === null || value === undefined || value === "") return undefined;
  const db = getDb();
  const id = String(value);
  if (source === "warehouses") return db.warehouses.find((item) => item.id === id)?.name;
  if (source === "suppliers") return db.suppliers.find((item) => item.id === id)?.name;
  if (source === "products") return db.products.find((item) => item.id === id)?.name;
  const def = getMasterData(source);
  const record = db.masters[source]?.find((item) => item.id === id);
  if (!def || !record) return undefined;
  const code = record[def.codeField];
  const label = record[def.labelField];
  return source === "employees" ? String(label) : `${code} – ${label}`;
}

function validateFields(fields: FieldDef[], values: Record<string, unknown>) {
  const errors: Record<string, string[]> = {};
  for (const field of fields) {
    const value = values[field.name];
    if (field.required && (value === undefined || value === null || value === "")) errors[field.name] = [`${field.label} is required.`];
    if ((field.type === "number" || field.type === "currency") && value !== undefined && value !== null && value !== "" && Number.isNaN(Number(value))) {
      errors[field.name] = [`${field.label} must be a number.`];
    }
  }
  if (Object.keys(errors).length) validationFailed(errors);
}

// Master data ---------------------------------------------------------------------

function masterDef(resource: string) {
  return getMasterData(resource) ?? notFound("Registry");
}

function enrichMaster(resource: string, record: MasterRecord): MasterRecord {
  const def = masterDef(resource);
  const labels: Record<string, string> = {};
  def.fields.forEach((field) => {
    const label = referenceLabel(field.optionsFrom, record[field.name]);
    if (label) labels[`${field.name}__label`] = label;
  });
  return { ...record, ...labels };
}

function referencedBy(resource: string, id: string) {
  const db = getDb();
  if (resource === "employees") {
    return db.masters.properties.some((item) => item.accountableId === id) || db.documents.some((doc) => Object.values(doc.fields).includes(id));
  }
  if (resource === "property-classifications") return db.masters.properties.some((item) => item.classificationId === id);
  if (resource === "locations") return db.masters.properties.some((item) => item.locationId === id);
  if (resource === "properties") return db.documents.some((doc) => doc.items.some((item) => item.refId === id));
  return false;
}

const masterRoutes: MockRoute[] = [
  {
    method: "GET",
    pattern: "/masters/:resource",
    handler: ({ params, query }) => {
      const def = masterDef(params.resource);
      const reserved = new Set(["page", "pageSize", "search", "sortBy", "sortOrder"]);
      const items = (getDb().masters[params.resource] ?? [])
        .filter((record) => Object.entries(query).every(([key, value]) => reserved.has(key) || !value || value === "all" || String(record[key]) === value))
        .map((record) => enrichMaster(params.resource, record))
        .filter((record) => matchesSearch(query.search, def.fields.filter((field) => field.list).flatMap((field) => [String(record[field.name] ?? ""), String(record[`${field.name}__label`] ?? "")])));
      return listResponse(items, { sortBy: def.codeField, ...query });
    },
  },
  {
    method: "GET",
    pattern: "/masters/:resource/:id",
    handler: ({ params }) => {
      const record = getDb().masters[params.resource]?.find((item) => item.id === params.id) ?? notFound("Record");
      return enrichMaster(params.resource, record);
    },
  },
  {
    method: "POST",
    pattern: "/masters/:resource",
    handler: (request) => {
      const def = masterDef(request.params.resource);
      requirePermission(request, def.managePermission);
      const body = bodyOf<Record<string, string | number | null>>(request);
      validateFields(def.fields, body);
      const list = (getDb().masters[def.key] ??= []);
      def.fields
        .filter((field) => field.unique)
        .forEach((field) => {
          if (list.some((item) => String(item[field.name]).toLowerCase() === String(body[field.name]).toLowerCase())) {
            validationFailed({ [field.name]: [`This ${field.label.toLowerCase()} is already used.`] });
          }
        });
      const timestamp = nowISO();
      const record: MasterRecord = { ...body, id: newId(def.key), createdAt: timestamp, updatedAt: timestamp };
      list.unshift(record);
      logActivityEntry(request, `added ${def.singular}`, String(record[def.labelField]), def.title);
      persistDb();
      return enrichMaster(def.key, record);
    },
  },
  {
    method: "PUT",
    pattern: "/masters/:resource/:id",
    handler: (request) => {
      const def = masterDef(request.params.resource);
      requirePermission(request, def.managePermission);
      const list = getDb().masters[def.key] ?? [];
      const record = list.find((item) => item.id === request.params.id) ?? notFound("Record");
      const body = bodyOf<Record<string, string | number | null>>(request);
      validateFields(def.fields, { ...record, ...body });
      def.fields
        .filter((field) => field.unique && body[field.name] !== undefined)
        .forEach((field) => {
          if (list.some((item) => item.id !== record.id && String(item[field.name]).toLowerCase() === String(body[field.name]).toLowerCase())) {
            validationFailed({ [field.name]: [`This ${field.label.toLowerCase()} is already used.`] });
          }
        });
      Object.assign(record, body, { id: record.id, updatedAt: nowISO() });
      logActivityEntry(request, `updated ${def.singular}`, String(record[def.labelField]), def.title);
      persistDb();
      return enrichMaster(def.key, record);
    },
  },
  {
    method: "DELETE",
    pattern: "/masters/:resource/:id",
    handler: (request) => {
      const def = masterDef(request.params.resource);
      requirePermission(request, def.managePermission);
      const db = getDb();
      const record = db.masters[def.key]?.find((item) => item.id === request.params.id) ?? notFound("Record");
      if (referencedBy(def.key, record.id)) conflict(`This ${def.singular} is used by other records. Set it to inactive instead of deleting it.`);
      db.masters[def.key] = db.masters[def.key].filter((item) => item.id !== record.id);
      logActivityEntry(request, `deleted ${def.singular}`, String(record[def.labelField]), def.title);
      persistDb();
      return { message: "Deleted." };
    },
  },
];

// Documents ---------------------------------------------------------------------

function docDef(type: string) {
  return getDocumentDef(type) ?? notFound("Document type");
}

function propertyRecord(id: string) {
  return getDb().masters.properties?.find((item) => item.id === id);
}

export function enrichDocument(doc: TransactionDocument): TransactionDocument {
  const def = docDef(doc.type);
  const db = getDb();
  const labels: Record<string, string> = {};
  def.fields.forEach((field) => {
    const label = referenceLabel(field.optionsFrom, doc.fields[field.name]);
    if (label) labels[field.name] = label;
  });
  const items = doc.items.map((item) => {
    if (def.itemMode === "property") {
      const property = propertyRecord(item.refId);
      return { ...item, code: String(property?.propertyNo ?? "—"), description: String(property?.description ?? "Unknown property"), unit: "unit" };
    }
    const product = db.products.find((entry) => entry.id === item.refId);
    return { ...item, code: product?.sku, description: product?.name ?? "Unknown item", unit: product?.unit };
  });
  return {
    ...doc,
    items,
    labels,
    totalQuantity: items.reduce((sum, item) => sum + Math.abs(item.quantity), 0),
    totalAmount: items.reduce((sum, item) => sum + Math.abs(item.quantity) * (item.unitCost ?? 0), 0),
  };
}

function validateDocument(def: DocumentDef, body: Partial<TransactionDocument>) {
  if (!body.date) validationFailed({ date: ["Date is required."] });
  validateFields(def.fields, body.fields ?? {});
  if (def.key === "stock-transfers" && body.fields?.fromWarehouseId === body.fields?.toWarehouseId) {
    validationFailed({ toWarehouseId: ["Choose a different destination warehouse."] });
  }
  if (def.key === "property-transfers" && body.fields?.fromEmployeeId === body.fields?.toEmployeeId) {
    validationFailed({ toEmployeeId: ["Choose a different receiving officer."] });
  }
  const items = body.items ?? [];
  if (!items.length) validationFailed({ items: ["Add at least one item."] });
  const errors: Record<string, string[]> = {};
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (!item.refId) errors[`items.${index}.refId`] = ["Select an item."];
    if (seen.has(item.refId)) errors[`items.${index}.refId`] = ["This item is already on the list."];
    seen.add(item.refId);
    if (def.itemMode === "stock" && (!Number.isInteger(item.quantity) || item.quantity <= 0)) errors[`items.${index}.quantity`] = ["Enter a quantity above 0."];
    if (def.itemMode === "count" && (!Number.isInteger(item.countedQty) || (item.countedQty ?? -1) < 0)) errors[`items.${index}.countedQty`] = ["Enter the counted quantity."];
  });
  if (Object.keys(errors).length) validationFailed(errors);
}

function normalizeItems(def: DocumentDef, items: DocumentItem[], fields: Record<string, unknown>): DocumentItem[] {
  const db = getDb();
  return items.map((item) => {
    if (def.itemMode === "property") {
      const property = propertyRecord(item.refId);
      return { refId: item.refId, quantity: 1, unitCost: Number(property?.acquisitionCost ?? 0), condition: item.condition ?? String(property?.condition ?? ""), remarks: item.remarks };
    }
    const product = db.products.find((entry) => entry.id === item.refId);
    if (def.itemMode === "count") {
      const systemQty = productTotals(item.refId, String(fields.warehouseId ?? ""));
      const countedQty = Number(item.countedQty ?? 0);
      return { refId: item.refId, systemQty, countedQty, quantity: countedQty - systemQty, unitCost: product?.unitCost, remarks: item.remarks };
    }
    const extra = def.ui.itemColumns.includes("receivedQty")
      ? { poQty: Number(item.poQty ?? item.quantity), receivedQty: Number(item.receivedQty ?? item.quantity), rejectedQty: Math.max(0, Number(item.receivedQty ?? item.quantity) - Number(item.quantity)) }
      : {};
    return { refId: item.refId, quantity: Number(item.quantity), unitCost: item.unitCost ?? product?.unitCost, remarks: item.remarks, ...extra };
  });
}

function nextNumber(def: DocumentDef, fields: Record<string, unknown>) {
  const prefix = documentPrefix(def, fields);
  const numbers = getDb().documents.filter((doc) => doc.type === def.key && doc.number.startsWith(`${prefix}-`)).map((doc) => Number(doc.number.split("-").pop()) || 0);
  return `${prefix}-${new Date().getFullYear()}-${String(Math.max(100, ...numbers) + 1).padStart(5, "0")}`;
}

function freshApprovals(def: DocumentDef, submitted: boolean) {
  return def.approvals.map((role, index) => ({ role, status: submitted && index === 0 ? ("pending" as const) : ("waiting" as const) }));
}

/** Applies the document's effect on stock or property. Validates availability first, so nothing is half-applied. */
function postDocument(request: MockRequest, def: DocumentDef, doc: TransactionDocument) {
  const performedBy = actorName(request.userId);
  const base = { reference: doc.number, performedBy };
  const f = doc.fields;
  const unitOf = (productId: string) => getDb().products.find((product) => product.id === productId)?.unit ?? "";
  const requireStock = (warehouseId: string, lines: { refId: string; quantity: number }[]) => {
    lines.forEach((line) => {
      const available = productTotals(line.refId, warehouseId);
      if (line.quantity > available) {
        const name = getDb().products.find((product) => product.id === line.refId)?.name ?? "item";
        throw new MockHttpError(422, `Not enough stock to post: ${name} has only ${available} ${unitOf(line.refId)} available.`);
      }
    });
  };

  switch (def.key) {
    case "stock-transfers": {
      requireStock(String(f.fromWarehouseId), doc.items);
      doc.items.forEach((item) => {
        postMovement({ ...base, productId: item.refId, warehouseId: String(f.fromWarehouseId), type: "transfer-out", quantity: item.quantity, reason: `Transfer to ${referenceLabel("warehouses", f.toWarehouseId)}`, sourceType: "transfer" });
        postMovement({ ...base, productId: item.refId, warehouseId: String(f.toWarehouseId), type: "transfer-in", quantity: item.quantity, reason: `Transfer from ${referenceLabel("warehouses", f.fromWarehouseId)}`, sourceType: "transfer" });
      });
      break;
    }
    case "stock-adjustments": {
      const inbound = String(f.adjustmentType).startsWith("Stock In");
      if (!inbound) requireStock(String(f.warehouseId), doc.items);
      doc.items.forEach((item) =>
        postMovement({ ...base, productId: item.refId, warehouseId: String(f.warehouseId), type: inbound ? "adjustment-in" : "adjustment-out", quantity: item.quantity, reason: String(f.reason), sourceType: "adjustment" }),
      );
      break;
    }
    case "receiving":
      doc.items.forEach((item) =>
        postMovement({ ...base, productId: item.refId, warehouseId: String(f.warehouseId), type: "receipt", quantity: item.quantity, reason: `Received from ${referenceLabel("suppliers", f.supplierId)} (${def.prefix})`, sourceType: "purchase-order" }),
      );
      break;
    case "issuances":
      requireStock(String(f.warehouseId), doc.items);
      doc.items.forEach((item) =>
        postMovement({ ...base, productId: item.refId, warehouseId: String(f.warehouseId), type: "issue", quantity: item.quantity, reason: `Issued to ${f.office}`, sourceType: "requisition" }),
      );
      break;
    case "returns":
      doc.items.forEach((item) =>
        postMovement({ ...base, productId: item.refId, warehouseId: String(f.warehouseId), type: "adjustment-in", quantity: item.quantity, reason: `Returned by ${f.returnedBy} (${f.reason})`, sourceType: "adjustment" }),
      );
      break;
    case "physical-counts":
    case "reconciliations":
      doc.items.forEach((item) => {
        const variance = Number(item.countedQty ?? 0) - productTotals(item.refId, String(f.warehouseId));
        if (!variance) return;
        postMovement({ ...base, productId: item.refId, warehouseId: String(f.warehouseId), type: variance > 0 ? "adjustment-in" : "adjustment-out", quantity: Math.abs(variance), reason: `${def.title} variance`, sourceType: "adjustment" });
      });
      break;
    case "property-assignments":
    case "property-transfers":
    case "property-returns":
    case "property-disposals":
      doc.items.forEach((item) => {
        const property = propertyRecord(item.refId);
        if (!property) return;
        if (def.key === "property-assignments") Object.assign(property, { accountableId: f.employeeId, status: "assigned" });
        if (def.key === "property-transfers") Object.assign(property, { accountableId: f.toEmployeeId, status: "assigned" });
        if (def.key === "property-returns") Object.assign(property, { accountableId: null, status: "available", condition: f.reason === "For Repair" ? "For Repair" : f.reason === "Unserviceable" ? "Unserviceable" : property.condition });
        if (def.key === "property-disposals") Object.assign(property, { accountableId: null, status: String(f.disposalType).startsWith("Lost") ? "lost" : "disposed" });
        property.updatedAt = nowISO();
      });
      break;
  }
}

function findDoc(type: string, id: string) {
  return getDb().documents.find((doc) => doc.type === type && doc.id === id) ?? notFound("Document");
}

const documentRoutes: MockRoute[] = [
  {
    method: "GET",
    pattern: "/documents/summary",
    handler: () => {
      const db = getDb();
      return Object.fromEntries(
        [...new Set(db.documents.map((doc) => doc.type))].map((type) => [
          type,
          {
            total: db.documents.filter((doc) => doc.type === type).length,
            pending: db.documents.filter((doc) => doc.type === type && doc.status === "pending").length,
          },
        ]),
      );
    },
  },
  {
    method: "GET",
    pattern: "/documents/:type",
    handler: ({ params, query }) => {
      const def = docDef(params.type);
      const items = getDb()
        .documents.filter((doc) => doc.type === params.type)
        .filter((doc) => !query.status || query.status === "all" || doc.status === query.status || displayStatus(def, doc) === query.status)
        .filter((doc) => def.fields.every((field) => !query[field.name] || (field.name === def.ui.typeField ? String(doc.fields[field.name] ?? "").startsWith(query[field.name]) : String(doc.fields[field.name] ?? "") === query[field.name])))
        .filter((doc) => (!query.from || doc.date >= query.from) && (!query.to || doc.date <= query.to))
        .map(enrichDocument)
        .filter((doc) => matchesSearch(query.search, [doc.number, doc.createdBy, doc.remarks, ...Object.values(doc.labels ?? {}), ...Object.values(doc.fields).map(String)]));
      return listResponse(items, { sortBy: "date", sortOrder: "desc", ...query });
    },
  },
  { method: "GET", pattern: "/documents/:type/:id", handler: ({ params }) => enrichDocument(findDoc(params.type, params.id)) },
  {
    method: "POST",
    pattern: "/documents/:type",
    handler: (request) => {
      const def = docDef(request.params.type);
      requirePermission(request, def.createPermission);
      const body = bodyOf<Partial<TransactionDocument> & { submit?: boolean }>(request);
      validateDocument(def, body);
      const timestamp = nowISO();
      const doc: TransactionDocument = {
        id: newId(def.prefix.toLowerCase()),
        type: def.key,
        number: nextNumber(def, body.fields ?? {}),
        date: body.date!,
        status: body.submit ? "pending" : "draft",
        fields: body.fields ?? {},
        items: normalizeItems(def, body.items ?? [], body.fields ?? {}),
        approvals: freshApprovals(def, Boolean(body.submit)),
        remarks: body.remarks,
        attachments: body.attachments ?? [],
        createdBy: actorName(request.userId),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      getDb().documents.unshift(doc);
      logActivityEntry(request, body.submit ? `submitted ${def.singular}` : `saved draft ${def.singular}`, doc.number, def.title);
      persistDb();
      return enrichDocument(doc);
    },
  },
  {
    method: "PUT",
    pattern: "/documents/:type/:id",
    handler: (request) => {
      const def = docDef(request.params.type);
      requirePermission(request, def.createPermission);
      const doc = findDoc(def.key, request.params.id);
      if (doc.status !== "draft" && doc.status !== "rejected") conflict("Only draft or returned documents can be edited.");
      const body = bodyOf<Partial<TransactionDocument> & { submit?: boolean }>(request);
      validateDocument(def, body);
      Object.assign(doc, {
        date: body.date,
        fields: body.fields,
        items: normalizeItems(def, body.items ?? [], body.fields ?? {}),
        remarks: body.remarks,
        attachments: body.attachments ?? doc.attachments ?? [],
        status: body.submit ? "pending" : "draft",
        approvals: freshApprovals(def, Boolean(body.submit)),
        updatedAt: nowISO(),
      });
      logActivityEntry(request, `updated ${def.singular}`, doc.number, def.title);
      persistDb();
      return enrichDocument(doc);
    },
  },
  {
    method: "POST",
    pattern: "/documents/:type/:id/submit",
    handler: (request) => {
      const def = docDef(request.params.type);
      requirePermission(request, def.createPermission);
      const doc = findDoc(def.key, request.params.id);
      if (doc.status !== "draft" && doc.status !== "rejected") conflict("Only drafts can be submitted.");
      doc.status = "pending";
      doc.approvals = freshApprovals(def, true);
      doc.updatedAt = nowISO();
      logActivityEntry(request, `submitted ${def.singular}`, doc.number, def.title);
      persistDb();
      return enrichDocument(doc);
    },
  },
  {
    method: "POST",
    pattern: "/documents/:type/:id/approve",
    handler: (request) => {
      const def = docDef(request.params.type);
      requirePermission(request, def.approvePermission);
      const doc = findDoc(def.key, request.params.id);
      if (doc.status !== "pending") conflict("Only pending documents can be approved.");
      const { remarks } = bodyOf<{ remarks?: string }>(request);
      const index = doc.approvals.findIndex((step) => step.status === "pending");
      if (index < 0) conflict("There is no pending approval step.");
      const last = index === doc.approvals.length - 1;
      if (last) postDocument(request, def, doc);
      const timestamp = nowISO();
      doc.approvals[index] = { ...doc.approvals[index], status: "approved", by: actorName(request.userId), at: timestamp, remarks: remarks ?? null };
      if (last) doc.status = "posted";
      else doc.approvals[index + 1] = { ...doc.approvals[index + 1], status: "pending" };
      doc.updatedAt = timestamp;
      logActivityEntry(request, last ? `approved and posted ${def.singular}` : `approved (${doc.approvals[index].role}) ${def.singular}`, doc.number, def.title);
      persistDb();
      return enrichDocument(doc);
    },
  },
  {
    method: "POST",
    pattern: "/documents/:type/:id/reject",
    handler: (request) => {
      const def = docDef(request.params.type);
      requirePermission(request, def.approvePermission);
      const doc = findDoc(def.key, request.params.id);
      if (doc.status !== "pending") conflict("Only pending documents can be returned.");
      const { remarks } = bodyOf<{ remarks?: string }>(request);
      if (!remarks?.trim()) validationFailed({ remarks: ["Give a reason so the preparer can correct it."] });
      const index = doc.approvals.findIndex((step) => step.status === "pending");
      doc.approvals[index] = { ...doc.approvals[index], status: "rejected", by: actorName(request.userId), at: nowISO(), remarks };
      doc.status = "rejected";
      doc.updatedAt = nowISO();
      logActivityEntry(request, `returned ${def.singular}`, doc.number, def.title);
      persistDb();
      return enrichDocument(doc);
    },
  },
  {
    method: "POST",
    pattern: "/documents/:type/:id/cancel",
    handler: (request) => {
      const def = docDef(request.params.type);
      requirePermission(request, def.createPermission);
      const doc = findDoc(def.key, request.params.id);
      if (doc.status === "posted" || doc.status === "cancelled") conflict(`A ${doc.status} document cannot be cancelled.`);
      doc.status = "cancelled";
      doc.updatedAt = nowISO();
      logActivityEntry(request, `cancelled ${def.singular}`, doc.number, def.title);
      persistDb();
      return enrichDocument(doc);
    },
  },
];

export const recordRoutes: MockRoute[] = [...masterRoutes, ...documentRoutes];
