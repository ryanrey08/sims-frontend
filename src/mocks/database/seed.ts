import { ALL_PERMISSIONS, PERMISSIONS, type Permission } from "@/constants/permissions";
import { appConfig } from "@/config/app.config";
import type {
  ActivityLog,
  AppNotification,
  Category,
  MovementType,
  Product,
  PurchaseOrder,
  PurchaseOrderStatus,
  Requisition,
  RequisitionStatus,
  Role,
  StockLevel,
  StockMovement,
  Supplier,
  User,
  Warehouse,
} from "@/types/models";
import { CATEGORY_FIXTURES, CATEGORY_SUPPLIER, PEOPLE, PRODUCT_FIXTURES, SUPPLIER_FIXTURES, WAREHOUSE_FIXTURES } from "./fixtures";
import { createRandom } from "./random";
import { seedMastersAndDocuments } from "./seedRecords";
import type { MockDatabase } from "./types";

/** Demo accounts available in mock mode. All share this demo password. */
export const DEMO_PASSWORD = "Password@123";

const DAY = 86400000;

function isoDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function daysAgo(days: number, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function rolePermissions(): Record<string, { description: string; permissions: Permission[] }> {
  const P = PERMISSIONS;
  return {
    Administrator: { description: "Full access to every module and system settings.", permissions: ALL_PERMISSIONS },
    "Inventory Manager": {
      description: "Oversees stock, warehouses, approvals and reporting.",
      permissions: [
        P.dashboardView, P.productsView, P.productsManage, P.suppliersView, P.suppliersManage, P.warehousesView,
        P.warehousesManage, P.inventoryView, P.inventoryAdjust, P.purchasingView, P.purchasingManage, P.purchasingApprove,
        P.requisitionsView, P.requisitionsCreate, P.requisitionsApprove, P.reportsView, P.usersView,
        P.inventoryApprove, P.propertyView, P.propertyManage, P.propertyApprove, P.monitoringView,
      ],
    },
    "Purchasing Officer": {
      description: "Manages suppliers and purchase orders.",
      permissions: [P.dashboardView, P.productsView, P.suppliersView, P.suppliersManage, P.warehousesView, P.inventoryView, P.purchasingView, P.purchasingManage, P.reportsView, P.monitoringView],
    },
    "Warehouse Staff": {
      description: "Receives deliveries, issues supplies and adjusts stock.",
      permissions: [P.dashboardView, P.productsView, P.warehousesView, P.inventoryView, P.inventoryAdjust, P.purchasingView, P.requisitionsView, P.requisitionsApprove, P.propertyView, P.propertyManage],
    },
    Requester: {
      description: "Department staff who request supplies.",
      permissions: [P.productsView, P.requisitionsView, P.requisitionsCreate],
    },
  };
}

export function createSeedDatabase(): MockDatabase {
  const random = createRandom(20261124);
  const created = daysAgo(120).toISOString();

  // Roles and users -----------------------------------------------------------
  const roles: Role[] = Object.entries(rolePermissions()).map(([name, value], index) => ({
    id: `role-${index + 1}`,
    name,
    description: value.description,
    permissions: value.permissions,
    isSystem: true,
    createdAt: created,
    updatedAt: created,
  }));
  const roleId = (name: string) => roles.find((role) => role.name === name)!.id;
  const users: User[] = [
    { name: "Andrea Villanueva", email: "admin@sims.local", role: "Administrator", department: "IT" },
    { name: "Roberto Aquino", email: "manager@sims.local", role: "Inventory Manager", department: "Logistics" },
    { name: "Liza Mercado", email: "purchasing@sims.local", role: "Purchasing Officer", department: "Finance" },
    { name: "Mark Soriano", email: "warehouse@sims.local", role: "Warehouse Staff", department: "Logistics" },
    { name: "Joy Navarro", email: "requester@sims.local", role: "Requester", department: "Human Resources" },
    { name: "Paolo Ramos", email: "p.ramos@sims.local", role: "Warehouse Staff", department: "Operations" },
    { name: "Grace Tan", email: "g.tan@sims.local", role: "Requester", department: "Sales" },
  ].map((user, index) => ({
    id: `user-${index + 1}`,
    name: user.name,
    email: user.email,
    roleId: roleId(user.role),
    department: user.department,
    status: index === 6 ? "inactive" : "active",
    lastLoginAt: index === 6 ? null : daysAgo(index % 3, 8 + index).toISOString(),
    createdAt: created,
    updatedAt: created,
  }));
  const credentials = Object.fromEntries(users.map((user) => [user.email, DEMO_PASSWORD]));

  // Catalog ---------------------------------------------------------------------
  const categories: Category[] = CATEGORY_FIXTURES.map((fixture, index) => ({
    id: `category-${index + 1}`,
    ...fixture,
    status: "active",
    createdAt: created,
    updatedAt: created,
  }));
  const categoryByCode = new Map(categories.map((category) => [category.code, category]));

  const suppliers: Supplier[] = SUPPLIER_FIXTURES.map((fixture, index) => ({
    id: `supplier-${index + 1}`,
    code: `SUP-${String(index + 1).padStart(3, "0")}`,
    name: fixture.name,
    contactPerson: fixture.contact,
    email: `orders@${fixture.name.toLowerCase().split(" ")[0].replace(/[^a-z]/g, "")}.ph`,
    phone: `09${random.int(10, 99)}${random.int(1000000, 9999999)}`,
    address: `${random.int(10, 999)} Commerce Ave., ${fixture.city}`,
    tin: `${random.int(100, 999)}-${random.int(100, 999)}-${random.int(100, 999)}-000`,
    paymentTerms: fixture.terms,
    leadTimeDays: fixture.lead,
    status: index === 8 ? "inactive" : "active",
    createdAt: created,
    updatedAt: created,
  }));

  const warehouses: Warehouse[] = WAREHOUSE_FIXTURES.map((fixture, index) => ({
    id: `warehouse-${index + 1}`,
    ...fixture,
    region: "NCR – National Capital Region",
    city: "Marikina City",
    phone: `(02) 8${random.int(100, 999)} ${random.int(1000, 9999)}`,
    status: "active",
    allowTransactions: true,
    allowTransfer: true,
    allowPhysicalInventory: true,
    defaultReceiving: index === 0,
    defaultIssuance: index === 1,
    remarks: index === 1 ? "Secondary warehouse for supplies and materials." : "",
    createdAt: created,
    updatedAt: created,
  }));

  const products: Product[] = PRODUCT_FIXTURES.map(([code, name, unit, cost, reorder, reorderQty], index) => {
    const category = categoryByCode.get(code)!;
    return {
      id: `product-${index + 1}`,
      sku: `ITM-${String(index + 1).padStart(5, "0")}`,
      name,
      description: `${name} for general ${category.name.toLowerCase()} use.`,
      categoryId: category.id,
      unit,
      unitCost: cost,
      reorderLevel: reorder,
      reorderQuantity: reorderQty,
      preferredSupplierId: suppliers[CATEGORY_SUPPLIER[code]].id,
      barcode: `480${String(1000000000 + index * 7919).slice(0, 10)}`,
      status: index === 14 ? "discontinued" : "active",
      createdAt: created,
      updatedAt: created,
    };
  });

  // Products deliberately kept low or empty so alerts have something to show.
  const lowIds = new Set(["product-4", "product-12", "product-23", "product-29", "product-33", "product-38"]);
  const emptyIds = new Set(["product-21", "product-35"]);

  // Movement events are collected first, then replayed in time order to compute balances.
  interface Event {
    at: Date;
    type: MovementType;
    productId: string;
    warehouseId: string;
    quantity: number;
    reason: string;
    reference: string;
    performedBy: string;
    sourceType?: StockMovement["sourceType"];
    sourceId?: string;
    onApplied?: (applied: number) => void;
  }
  const events: Event[] = [];

  products.forEach((product) => {
    if (emptyIds.has(product.id)) return;
    warehouses.forEach((warehouse, warehouseIndex) => {
      if (warehouseIndex > 0 && !random.chance(warehouseIndex === 3 ? 0.4 : 0.6)) return;
      const factor = lowIds.has(product.id) ? 0.6 : random.next() * 3 + 1.8;
      const base = Math.max(1, Math.round(product.reorderLevel * factor * (warehouseIndex === 0 ? 1.4 : 0.5)));
      events.push({
        at: daysAgo(45, 8),
        type: "adjustment-in",
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: base,
        reason: "Opening balance",
        reference: `ADJ-OPEN-${warehouse.code}`,
        performedBy: "Roberto Aquino",
        sourceType: "adjustment",
      });
    });
  });

  // Purchase orders -------------------------------------------------------------------
  const purchaseOrders: PurchaseOrder[] = [];
  const poStatuses: PurchaseOrderStatus[] = [
    "received", "received", "received", "received", "received", "received", "partially-received",
    "approved", "approved", "pending", "pending", "pending", "draft", "cancelled",
  ];
  const restockable = products.filter((product) => !lowIds.has(product.id) && !emptyIds.has(product.id) && product.status === "active");
  poStatuses.forEach((status, index) => {
    const supplier = suppliers[index % 8];
    const supplierProducts = restockable.filter((product) => product.preferredSupplierId === supplier.id);
    const pool = supplierProducts.length ? supplierProducts : restockable;
    const lineCount = Math.min(pool.length, random.int(2, 4));
    const chosen = [...pool].sort(() => random.next() - 0.5).slice(0, lineCount);
    const orderedDaysAgo = 40 - index * 2.6;
    const orderDate = daysAgo(Math.round(orderedDaysAgo));
    const warehouse = index % 4 === 3 ? warehouses[1] : warehouses[0];
    const po: PurchaseOrder = {
      id: `po-${index + 1}`,
      poNumber: `PO-2026-${String(101 + index).padStart(4, "0")}`,
      supplierId: supplier.id,
      warehouseId: warehouse.id,
      orderDate: isoDate(orderDate),
      expectedDate: isoDate(new Date(orderDate.getTime() + supplier.leadTimeDays * DAY)),
      status,
      items: chosen.map((product) => ({
        productId: product.id,
        quantity: product.reorderQuantity,
        receivedQuantity: 0,
        unitCost: product.unitCost,
      })),
      notes: status === "cancelled" ? "Cancelled: supplier unable to meet delivery date." : undefined,
      createdBy: "Liza Mercado",
      approvedBy: ["draft", "pending", "cancelled"].includes(status) ? null : "Roberto Aquino",
      createdAt: orderDate.toISOString(),
      updatedAt: orderDate.toISOString(),
    };
    if (status === "received" || status === "partially-received") {
      const receivedAt = daysAgo(Math.max(1, Math.round(orderedDaysAgo - supplier.leadTimeDays)), 14);
      po.items.forEach((item, itemIndex) => {
        const quantity = status === "received" ? item.quantity : itemIndex === 0 ? Math.round(item.quantity / 2) : 0;
        if (!quantity) return;
        item.receivedQuantity = quantity;
        events.push({
          at: receivedAt,
          type: "receipt",
          productId: item.productId,
          warehouseId: warehouse.id,
          quantity,
          reason: `Received from ${supplier.name}`,
          reference: po.poNumber,
          performedBy: "Mark Soriano",
          sourceType: "purchase-order",
          sourceId: po.id,
        });
      });
      po.updatedAt = receivedAt.toISOString();
    }
    purchaseOrders.push(po);
  });

  // Requisitions -------------------------------------------------------------------------
  const requisitions: Requisition[] = [];
  const reqStatuses: RequisitionStatus[] = [
    "issued", "issued", "issued", "issued", "issued", "issued", "issued", "issued",
    "approved", "approved", "pending", "pending", "pending", "rejected", "cancelled",
  ];
  const purposes = ["Monthly office supply replenishment", "Quarterly sanitation supplies", "New hire onboarding kits", "Training event materials", "Printer consumables for reports", "Field operations safety gear"];
  reqStatuses.forEach((status, index) => {
    const department = appConfig.departments[index % appConfig.departments.length];
    const created = daysAgo(Math.max(0, 32 - index * 2), 10);
    const warehouse = index % 5 === 4 ? warehouses[3] : warehouses[0];
    const pool = products.filter((product) => product.status === "active");
    const chosen = [...pool].sort(() => random.next() - 0.5).slice(0, random.int(2, 4));
    const requisition: Requisition = {
      id: `req-${index + 1}`,
      reqNumber: `RIS-2026-${String(201 + index).padStart(4, "0")}`,
      department,
      requestedBy: PEOPLE[index % PEOPLE.length],
      warehouseId: warehouse.id,
      neededBy: isoDate(new Date(created.getTime() + 5 * DAY)),
      purpose: purposes[index % purposes.length],
      priority: (["normal", "normal", "high", "low", "urgent"] as const)[index % 5],
      status,
      items: chosen.map((product) => ({ productId: product.id, quantity: random.int(2, Math.max(3, Math.round(product.reorderLevel / 2))), issuedQuantity: 0 })),
      remarks: status === "rejected" ? "Quantities exceed the department's monthly allocation." : undefined,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    };
    if (status === "issued") {
      const issuedAt = new Date(created.getTime() + DAY + 3 * 3600000);
      requisition.updatedAt = issuedAt.toISOString();
      requisition.items.forEach((item) => {
        events.push({
          at: issuedAt,
          type: "issue",
          productId: item.productId,
          warehouseId: warehouse.id,
          quantity: item.quantity,
          reason: `Issued to ${department}`,
          reference: requisition.reqNumber,
          performedBy: "Mark Soriano",
          sourceType: "requisition",
          sourceId: requisition.id,
          onApplied: (applied) => {
            item.issuedQuantity = applied;
          },
        });
      });
    }
    requisitions.push(requisition);
  });

  // Day-to-day consumption so the movement charts have texture, plus a couple of transfers.
  for (let day = 28; day >= 1; day -= 1) {
    const date = daysAgo(day, 15);
    if (date.getDay() === 0) continue;
    for (let n = 0; n < random.int(1, 3); n += 1) {
      const product = random.pick(products);
      events.push({
        at: date,
        type: "issue",
        productId: product.id,
        warehouseId: warehouses[3].id,
        quantity: random.int(1, 4),
        reason: "Walk-in issuance",
        reference: `ISS-${isoDate(date).replace(/-/g, "")}-${n + 1}`,
        performedBy: "Joy Navarro",
        sourceType: "requisition",
      });
    }
  }
  [["product-11", 20], ["product-24", 10], ["product-1", 6]].forEach(([productId, quantity], index) => {
    const at = daysAgo(12 - index * 4, 11);
    const reference = `TRF-2026-${String(31 + index).padStart(4, "0")}`;
    events.push({ at, type: "transfer-out", productId: productId as string, warehouseId: warehouses[0].id, quantity: quantity as number, reason: `Transfer to ${warehouses[3].name}`, reference, performedBy: "Mark Soriano", sourceType: "transfer" });
    events.push({ at: new Date(at.getTime() + 60000), type: "transfer-in", productId: productId as string, warehouseId: warehouses[3].id, quantity: quantity as number, reason: `Transfer from ${warehouses[0].name}`, reference, performedBy: "Mark Soriano", sourceType: "transfer" });
  });
  events.push({ at: daysAgo(6, 16), type: "adjustment-out", productId: "product-22", warehouseId: warehouses[0].id, quantity: 3, reason: "Damaged during handling", reference: "ADJ-2026-0042", performedBy: "Roberto Aquino", sourceType: "adjustment" });

  // Replay events in time order to compute balances.
  const balances = new Map<string, number>();
  const unitCost = new Map(products.map((product) => [product.id, product.unitCost]));
  const movements: StockMovement[] = [];
  events
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .forEach((event, index) => {
      const key = `${event.productId}|${event.warehouseId}`;
      const current = balances.get(key) ?? 0;
      const inbound = event.type === "receipt" || event.type === "adjustment-in" || event.type === "transfer-in";
      const quantity = inbound ? event.quantity : Math.min(event.quantity, current);
      event.onApplied?.(quantity);
      if (!inbound && quantity === 0) return;
      const balance = inbound ? current + quantity : current - quantity;
      balances.set(key, balance);
      movements.push({
        id: `movement-${index + 1}`,
        reference: event.reference,
        type: event.type,
        productId: event.productId,
        warehouseId: event.warehouseId,
        quantity,
        unitCost: unitCost.get(event.productId) ?? 0,
        balanceAfter: balance,
        reason: event.reason,
        performedBy: event.performedBy,
        createdAt: event.at.toISOString(),
        sourceType: event.sourceType,
        sourceId: event.sourceId,
      });
    });

  const stockLevels: StockLevel[] = [...balances.entries()].map(([key, quantity], index) => {
    const [productId, warehouseId] = key.split("|");
    return { id: `stock-${index + 1}`, productId, warehouseId, quantity, updatedAt: daysAgo(1).toISOString() };
  });

  const notifications: AppNotification[] = [
    { id: "notif-1", title: "Low stock alert", message: "Several products are at or below their reorder level.", type: "warning", read: false, link: "/inventory?stockStatus=low-stock", createdAt: daysAgo(0, 8).toISOString() },
    { id: "notif-2", title: "Purchase orders awaiting approval", message: "3 purchase orders are pending approval.", type: "info", read: false, link: "/purchase-orders?status=pending", createdAt: daysAgo(0, 9).toISOString() },
    { id: "notif-3", title: "Out of stock", message: "LAN Cable Cat6 is out of stock at Central Warehouse.", type: "danger", read: false, link: "/products/product-21", createdAt: daysAgo(1, 13).toISOString() },
    { id: "notif-4", title: "Delivery received", message: `${purchaseOrders[5].poNumber} was received in full.`, type: "success", read: true, link: `/purchase-orders/${purchaseOrders[5].id}`, createdAt: daysAgo(3, 15).toISOString() },
    { id: "notif-5", title: "New requisition", message: "Human Resources submitted a supply requisition.", type: "info", read: true, link: "/requisitions?status=pending", createdAt: daysAgo(4, 10).toISOString() },
  ];

  const activities: ActivityLog[] = [
    { actor: "Mark Soriano", action: "received delivery for", target: purchaseOrders[5].poNumber, module: "Purchasing", createdAt: daysAgo(0, 10).toISOString() },
    { actor: "Roberto Aquino", action: "approved purchase order", target: purchaseOrders[8].poNumber, module: "Purchasing", createdAt: daysAgo(0, 9).toISOString() },
    { actor: "Joy Navarro", action: "submitted requisition", target: requisitions[12].reqNumber, module: "Requisitions", createdAt: daysAgo(1, 14).toISOString() },
    { actor: "Mark Soriano", action: "issued supplies for", target: requisitions[7].reqNumber, module: "Requisitions", createdAt: daysAgo(1, 11).toISOString() },
    { actor: "Roberto Aquino", action: "adjusted stock of", target: "Liquid Hand Soap, 1 gallon", module: "Inventory", createdAt: daysAgo(6, 16).toISOString() },
    { actor: "Liza Mercado", action: "created purchase order", target: purchaseOrders[12].poNumber, module: "Purchasing", createdAt: daysAgo(7, 10).toISOString() },
  ].map((activity, index) => ({ ...activity, id: `activity-${index + 1}` }));

  const { masters, documents } = seedMastersAndDocuments({ warehouses, products, suppliers, random, daysAgo, isoDate });

  return {
    masters,
    documents,
    categories,
    products,
    suppliers,
    warehouses,
    stockLevels,
    movements,
    purchaseOrders,
    requisitions,
    users,
    roles,
    settings: {
      organizationName: "Sampaguita Holdings Corporation",
      address: "8F Ayala Tower, Ayala Ave., Makati City, Metro Manila",
      email: "supply@sims.local",
      phone: "(02) 8123 4567",
      currency: "PHP",
      poPrefix: "PO-2026-",
      requisitionPrefix: "RIS-2026-",
      defaultWarehouseId: warehouses[0].id,
      lowStockAlerts: true,
      requirePoApproval: true,
      updatedAt: created,
    },
    notifications,
    activities,
    credentials,
    sessions: {},
    resetTokens: {},
  };
}
