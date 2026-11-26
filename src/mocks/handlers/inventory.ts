import { PERMISSIONS } from "@/constants/permissions";
import { getDb, persistDb } from "../database/db";
import { logActivityEntry } from "./activity";
import { actorName, enrichMovement, enrichStockLevel, postMovement, productTotals } from "./relations";
import {
  applyFilters,
  bodyOf,
  listResponse,
  matchesSearch,
  notFound,
  requireFields,
  requirePermission,
  validationFailed,
  type MockRoute,
} from "./utils";

let adjustmentCounter = 100;
let transferCounter = 100;

export const inventoryRoutes: MockRoute[] = [
  {
    method: "GET",
    pattern: "/inventory/summary",
    handler: ({ query }) => {
      const db = getDb();
      const levels = applyFilters(db.stockLevels, query, ["warehouseId"]).map(enrichStockLevel);
      const cost = new Map(db.products.map((product) => [product.id, product.unitCost]));
      const totalValue = levels.reduce((sum, level) => sum + (level.value ?? 0), 0);
      // Walk back month by month: value at the end of a month = current value minus later net movements.
      const now = new Date();
      const valueTrend = Array.from({ length: 6 }, (_, back) => {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - back + 1, 1);
        const later = db.movements
          .filter((movement) => (!query.warehouseId || movement.warehouseId === query.warehouseId) && new Date(movement.createdAt) >= monthEnd)
          .reduce((sum, movement) => sum + (["receipt", "adjustment-in", "transfer-in"].includes(movement.type) ? 1 : -1) * movement.quantity * (cost.get(movement.productId) ?? 0), 0);
        const label = new Date(now.getFullYear(), now.getMonth() - back, 1).toLocaleString("en-US", { month: "short" });
        return { label, value: Math.max(0, Math.round(totalValue - later)) };
      }).reverse();
      return {
        totalItems: levels.reduce((sum, level) => sum + level.quantity, 0),
        totalValue,
        belowReorder: levels.filter((level) => level.stockStatus === "low-stock").length,
        outOfStock: levels.filter((level) => level.stockStatus === "out-of-stock").length,
        valueTrend,
      };
    },
  },
  {
    method: "GET",
    pattern: "/inventory/stock",
    handler: ({ query }) => {
      const db = getDb();
      const categoryOf = new Map(db.products.map((product) => [product.id, product.categoryId]));
      const items = applyFilters(db.stockLevels, query, ["warehouseId", "productId"])
        .filter((level) => !query.categoryId || categoryOf.get(level.productId) === query.categoryId)
        .map(enrichStockLevel)
        .filter((level) => !query.stockStatus || level.stockStatus === query.stockStatus)
        .filter((level) => matchesSearch(query.search, [level.sku, level.productName, level.warehouseName]));
      return listResponse(items, { sortBy: "productName", ...query });
    },
  },
  {
    method: "GET",
    pattern: "/inventory/movements",
    handler: ({ query }) => {
      const items = applyFilters(getDb().movements, query, ["type", "warehouseId", "productId", "sourceType"])
        .filter((item) => (!query.from || item.createdAt.slice(0, 10) >= query.from) && (!query.to || item.createdAt.slice(0, 10) <= query.to))
        .map(enrichMovement)
        .filter((item) => matchesSearch(query.search, [item.reference, item.productName, item.sku, item.reason, item.performedBy]));
      return listResponse(items, { sortBy: "createdAt", sortOrder: "desc", ...query });
    },
  },
  {
    method: "GET",
    pattern: "/inventory/availability",
    handler: ({ query }) => {
      requireFields(query, ["productId", "warehouseId"]);
      return { productId: query.productId, warehouseId: query.warehouseId, quantity: productTotals(query.productId, query.warehouseId) };
    },
  },
  {
    method: "POST",
    pattern: "/inventory/adjustments",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.inventoryAdjust);
      const body = bodyOf<{ productId: string; warehouseId: string; direction: "in" | "out"; quantity: number; reason: string }>(request);
      requireFields(body, ["productId", "warehouseId", "direction", "quantity", "reason"]);
      const db = getDb();
      const product = db.products.find((item) => item.id === body.productId) ?? notFound("Product");
      if (!db.warehouses.some((item) => item.id === body.warehouseId)) notFound("Warehouse");
      if (!Number.isInteger(body.quantity) || body.quantity <= 0) validationFailed({ quantity: ["Enter a whole number greater than zero."] });
      const available = productTotals(body.productId, body.warehouseId);
      if (body.direction === "out" && body.quantity > available) {
        validationFailed({ quantity: [`Only ${available} ${product.unit} available in this warehouse.`] });
      }
      adjustmentCounter += 1;
      const movement = postMovement({
        productId: body.productId,
        warehouseId: body.warehouseId,
        type: body.direction === "in" ? "adjustment-in" : "adjustment-out",
        quantity: body.quantity,
        reason: body.reason,
        reference: `ADJ-2026-${String(adjustmentCounter).padStart(4, "0")}`,
        performedBy: actorName(request.userId),
        sourceType: "adjustment",
      });
      logActivityEntry(request, `adjusted stock (${body.direction === "in" ? "+" : "−"}${body.quantity}) of`, product.name, "Inventory");
      persistDb();
      return enrichMovement(movement);
    },
  },
  {
    method: "POST",
    pattern: "/inventory/transfers",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.inventoryAdjust);
      const body = bodyOf<{ productId: string; fromWarehouseId: string; toWarehouseId: string; quantity: number; reason: string }>(request);
      requireFields(body, ["productId", "fromWarehouseId", "toWarehouseId", "quantity"]);
      const db = getDb();
      const product = db.products.find((item) => item.id === body.productId) ?? notFound("Product");
      const from = db.warehouses.find((item) => item.id === body.fromWarehouseId) ?? notFound("Warehouse");
      const to = db.warehouses.find((item) => item.id === body.toWarehouseId) ?? notFound("Warehouse");
      if (from.id === to.id) validationFailed({ toWarehouseId: ["Choose a different destination warehouse."] });
      if (to.status !== "active") validationFailed({ toWarehouseId: ["The destination warehouse is inactive."] });
      const available = productTotals(product.id, from.id);
      if (!Number.isInteger(body.quantity) || body.quantity <= 0) validationFailed({ quantity: ["Enter a whole number greater than zero."] });
      if (body.quantity > available) validationFailed({ quantity: [`Only ${available} ${product.unit} available at ${from.name}.`] });
      transferCounter += 1;
      const reference = `TRF-2026-${String(transferCounter).padStart(4, "0")}`;
      const performedBy = actorName(request.userId);
      postMovement({ productId: product.id, warehouseId: from.id, type: "transfer-out", quantity: body.quantity, reason: body.reason || `Transfer to ${to.name}`, reference, performedBy, sourceType: "transfer" });
      const inbound = postMovement({ productId: product.id, warehouseId: to.id, type: "transfer-in", quantity: body.quantity, reason: body.reason || `Transfer from ${from.name}`, reference, performedBy, sourceType: "transfer" });
      logActivityEntry(request, `transferred ${body.quantity} ${product.unit} of`, `${product.name} (${from.code} → ${to.code})`, "Inventory");
      persistDb();
      return enrichMovement(inbound);
    },
  },
];
