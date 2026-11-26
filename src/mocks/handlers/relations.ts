import type {
  Category,
  MovementType,
  Product,
  PurchaseOrder,
  Requisition,
  Role,
  StockLevel,
  StockMovement,
  StockStatus,
  Supplier,
  User,
  Warehouse,
} from "@/types/models";
import { getDb, newId, nowISO } from "../database/db";

/** Adds derived, related fields to records, as a real API would via joins. */
export function stockStatusOf(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= reorderLevel) return "low-stock";
  return "in-stock";
}

export function productTotals(productId: string, warehouseId?: string) {
  const levels = getDb().stockLevels.filter((level) => level.productId === productId && (!warehouseId || level.warehouseId === warehouseId));
  return levels.reduce((sum, level) => sum + level.quantity, 0);
}

export function enrichProduct(product: Product, warehouseId?: string): Product {
  const db = getDb();
  const totalStock = productTotals(product.id, warehouseId);
  return {
    ...product,
    categoryName: db.categories.find((item) => item.id === product.categoryId)?.name ?? "—",
    supplierName: db.suppliers.find((item) => item.id === product.preferredSupplierId)?.name ?? null,
    totalStock,
    stockValue: totalStock * product.unitCost,
    stockStatus: stockStatusOf(totalStock, product.reorderLevel),
  };
}

export function enrichCategory(category: Category): Category {
  return { ...category, productCount: getDb().products.filter((item) => item.categoryId === category.id).length };
}

export function enrichSupplier(supplier: Supplier): Supplier {
  const orders = getDb().purchaseOrders.filter((order) => order.supplierId === supplier.id && order.status !== "cancelled");
  return {
    ...supplier,
    orderCount: orders.length,
    totalPurchased: orders.reduce((sum, order) => sum + orderTotal(order), 0),
  };
}

export function enrichWarehouse(warehouse: Warehouse): Warehouse {
  const db = getDb();
  const levels = db.stockLevels.filter((level) => level.warehouseId === warehouse.id && level.quantity > 0);
  const cost = new Map(db.products.map((product) => [product.id, product.unitCost]));
  return {
    ...warehouse,
    locationCount: (db.masters.locations ?? []).filter((location) => location.warehouseId === warehouse.id).length,
    itemCount: levels.length,
    totalUnits: levels.reduce((sum, level) => sum + level.quantity, 0),
    stockValue: levels.reduce((sum, level) => sum + level.quantity * (cost.get(level.productId) ?? 0), 0),
  };
}

export function enrichStockLevel(level: StockLevel): StockLevel {
  const db = getDb();
  const product = db.products.find((item) => item.id === level.productId);
  return {
    ...level,
    sku: product?.sku,
    productName: product?.name ?? "Unknown product",
    categoryName: db.categories.find((item) => item.id === product?.categoryId)?.name,
    unit: product?.unit,
    unitCost: product?.unitCost,
    reorderLevel: product?.reorderLevel,
    warehouseName: db.warehouses.find((item) => item.id === level.warehouseId)?.name,
    value: level.quantity * (product?.unitCost ?? 0),
    stockStatus: stockStatusOf(level.quantity, product?.reorderLevel ?? 0),
  };
}

export function enrichMovement(movement: StockMovement): StockMovement {
  const db = getDb();
  const product = db.products.find((item) => item.id === movement.productId);
  return {
    ...movement,
    sku: product?.sku,
    productName: product?.name ?? "Unknown product",
    unit: product?.unit,
    warehouseName: db.warehouses.find((item) => item.id === movement.warehouseId)?.name,
  };
}

export function orderTotal(order: PurchaseOrder) {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
}

export function enrichPurchaseOrder(order: PurchaseOrder): PurchaseOrder {
  const db = getDb();
  return {
    ...order,
    supplierName: db.suppliers.find((item) => item.id === order.supplierId)?.name ?? "Unknown supplier",
    warehouseName: db.warehouses.find((item) => item.id === order.warehouseId)?.name,
    total: orderTotal(order),
    itemCount: order.items.length,
    items: order.items.map((item) => {
      const product = db.products.find((entry) => entry.id === item.productId);
      return { ...item, sku: product?.sku, productName: product?.name ?? "Unknown product", unit: product?.unit };
    }),
  };
}

export function enrichRequisition(requisition: Requisition): Requisition {
  const db = getDb();
  return {
    ...requisition,
    warehouseName: db.warehouses.find((item) => item.id === requisition.warehouseId)?.name,
    itemCount: requisition.items.length,
    items: requisition.items.map((item) => {
      const product = db.products.find((entry) => entry.id === item.productId);
      return {
        ...item,
        sku: product?.sku,
        productName: product?.name ?? "Unknown product",
        unit: product?.unit,
        available: productTotals(item.productId, requisition.warehouseId),
      };
    }),
  };
}

export function enrichUser(user: User): User {
  return { ...user, roleName: getDb().roles.find((item) => item.id === user.roleId)?.name ?? "—" };
}

export function enrichRole(role: Role): Role {
  return { ...role, userCount: getDb().users.filter((item) => item.roleId === role.id).length };
}

/** Applies a stock change and records the movement. Callers validate availability first. */
export function postMovement(input: {
  productId: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  reference: string;
  performedBy: string;
  sourceType?: StockMovement["sourceType"];
  sourceId?: string;
}) {
  const db = getDb();
  let level = db.stockLevels.find((item) => item.productId === input.productId && item.warehouseId === input.warehouseId);
  if (!level) {
    level = { id: newId("stock"), productId: input.productId, warehouseId: input.warehouseId, quantity: 0, updatedAt: nowISO() };
    db.stockLevels.push(level);
  }
  const inbound = input.type === "receipt" || input.type === "adjustment-in" || input.type === "transfer-in";
  level.quantity += inbound ? input.quantity : -input.quantity;
  level.updatedAt = nowISO();
  const movement: StockMovement = {
    id: newId("movement"),
    ...input,
    unitCost: db.products.find((item) => item.id === input.productId)?.unitCost ?? 0,
    balanceAfter: level.quantity,
    createdAt: nowISO(),
  };
  db.movements.push(movement);
  return movement;
}

export function actorName(userId: string | null) {
  return getDb().users.find((user) => user.id === userId)?.name ?? "System";
}
