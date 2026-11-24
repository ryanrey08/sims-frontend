import type { ChartPoint, DashboardSummary, MovementReport, PurchasingReport, StockMovement, ValuationReport } from "@/types/models";
import { STATUS_META } from "@/constants/status";
import { getDb } from "../database/db";
import { enrichMovement, enrichProduct, enrichPurchaseOrder, enrichStockLevel, orderTotal } from "./relations";
import { matchesSearch, round, type MockRoute } from "./utils";

const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });
const monthName = new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric" });
const INBOUND = new Set(["receipt", "adjustment-in", "transfer-in"]);

function localDate(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function dailyFlow(movements: StockMovement[], days: number, from?: string, to?: string): ChartPoint[] {
  const end = to ? new Date(`${to}T00:00:00`) : new Date();
  const start = from ? new Date(`${from}T00:00:00`) : new Date(end.getTime() - (days - 1) * 86400000);
  const points: ChartPoint[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = localDate(cursor.toISOString());
    const sameDay = movements.filter((item) => localDate(item.createdAt) === key);
    points.push({
      label: shortDate.format(cursor),
      inbound: sameDay.filter((item) => INBOUND.has(item.type)).reduce((sum, item) => sum + item.quantity, 0),
      outbound: sameDay.filter((item) => !INBOUND.has(item.type)).reduce((sum, item) => sum + item.quantity, 0),
    });
  }
  return points;
}

export const insightRoutes: MockRoute[] = [
  {
    method: "GET",
    pattern: "/dashboard/summary",
    handler: ({ query }): DashboardSummary => {
      const db = getDb();
      const warehouseId = query.warehouseId || undefined;
      const products = db.products.filter((item) => item.status === "active").map((item) => enrichProduct(item, warehouseId));
      const movements = db.movements.filter((item) => !warehouseId || item.warehouseId === warehouseId);
      const categoryValue = new Map<string, number>();
      products.forEach((product) => categoryValue.set(product.categoryName ?? "Other", (categoryValue.get(product.categoryName ?? "Other") ?? 0) + (product.stockValue ?? 0)));
      return {
        totals: {
          products: products.length,
          inventoryValue: products.reduce((sum, item) => sum + (item.stockValue ?? 0), 0),
          totalUnits: products.reduce((sum, item) => sum + (item.totalStock ?? 0), 0),
          lowStock: products.filter((item) => item.stockStatus === "low-stock").length,
          outOfStock: products.filter((item) => item.stockStatus === "out-of-stock").length,
          pendingPurchaseOrders: db.purchaseOrders.filter((item) => item.status === "pending").length,
          pendingRequisitions: db.requisitions.filter((item) => item.status === "pending" && (!warehouseId || item.warehouseId === warehouseId)).length,
          activeSuppliers: db.suppliers.filter((item) => item.status === "active").length,
        },
        movementTrend: dailyFlow(movements, 14),
        valueByCategory: [...categoryValue.entries()]
          .map(([label, value]) => ({ label, value: Math.round(value) }))
          .sort((a, b) => b.value - a.value),
        stockStatus: (["in-stock", "low-stock", "out-of-stock"] as const).map((status) => ({
          label: STATUS_META[status].label,
          value: products.filter((item) => item.stockStatus === status).length,
        })),
        lowStockItems: products
          .filter((item) => item.stockStatus !== "in-stock")
          .sort((a, b) => (a.totalStock ?? 0) / a.reorderLevel - (b.totalStock ?? 0) / b.reorderLevel)
          .slice(0, 6),
        recentMovements: [...movements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(enrichMovement),
      };
    },
  },
  {
    method: "GET",
    pattern: "/dashboard/activities",
    handler: ({ query }) => getDb().activities.slice(0, Number(query.limit) || 8),
  },
  {
    method: "GET",
    pattern: "/reports/valuation",
    handler: ({ query }): ValuationReport => {
      const db = getDb();
      const categoryOf = new Map(db.products.map((product) => [product.id, product.categoryId]));
      const rows = db.stockLevels
        .filter((level) => (!query.warehouseId || level.warehouseId === query.warehouseId) && (!query.categoryId || categoryOf.get(level.productId) === query.categoryId))
        .filter((level) => level.quantity > 0)
        .map(enrichStockLevel)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      const group = (key: "categoryName" | "warehouseName") => {
        const map = new Map<string, number>();
        rows.forEach((row) => map.set(row[key] ?? "Other", (map.get(row[key] ?? "Other") ?? 0) + (row.value ?? 0)));
        return [...map.entries()].map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value);
      };
      return {
        totalValue: rows.reduce((sum, row) => sum + (row.value ?? 0), 0),
        totalUnits: rows.reduce((sum, row) => sum + row.quantity, 0),
        byCategory: group("categoryName"),
        byWarehouse: group("warehouseName"),
        rows,
      };
    },
  },
  {
    method: "GET",
    pattern: "/reports/movements",
    handler: ({ query }): MovementReport => {
      const db = getDb();
      const categoryOf = new Map(db.products.map((product) => [product.id, product.categoryId]));
      const rows = db.movements
        .filter((item) => !query.warehouseId || item.warehouseId === query.warehouseId)
        .filter((item) => !query.categoryId || categoryOf.get(item.productId) === query.categoryId)
        .filter((item) => (!query.from || localDate(item.createdAt) >= query.from) && (!query.to || localDate(item.createdAt) <= query.to))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(enrichMovement);
      const inbound = rows.filter((item) => INBOUND.has(item.type)).reduce((sum, item) => sum + item.quantity, 0);
      const outbound = rows.filter((item) => !INBOUND.has(item.type)).reduce((sum, item) => sum + item.quantity, 0);
      const types = ["receipt", "issue", "adjustment-in", "adjustment-out", "transfer-in", "transfer-out"];
      return {
        daily: dailyFlow(rows, 30, query.from, query.to),
        byType: types.map((type) => ({ label: STATUS_META[type].label, value: rows.filter((item) => item.type === type).reduce((sum, item) => sum + item.quantity, 0) })),
        totals: { inbound, outbound, net: inbound - outbound },
        rows,
      };
    },
  },
  {
    method: "GET",
    pattern: "/reports/purchasing",
    handler: ({ query }): PurchasingReport => {
      const db = getDb();
      const rows = db.purchaseOrders
        .filter((item) => !query.supplierId || item.supplierId === query.supplierId)
        .filter((item) => (!query.from || item.orderDate >= query.from) && (!query.to || item.orderDate <= query.to))
        .map(enrichPurchaseOrder)
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
      const committed = rows.filter((item) => item.status !== "cancelled" && item.status !== "draft");
      const bySupplier = new Map<string, number>();
      const byMonth = new Map<string, number>();
      [...committed].reverse().forEach((order) => {
        bySupplier.set(order.supplierName ?? "—", (bySupplier.get(order.supplierName ?? "—") ?? 0) + orderTotal(order));
        const month = monthName.format(new Date(`${order.orderDate}T00:00:00`));
        byMonth.set(month, (byMonth.get(month) ?? 0) + orderTotal(order));
      });
      const statuses = ["draft", "pending", "approved", "partially-received", "received", "cancelled"];
      return {
        totalSpend: committed.reduce((sum, order) => sum + orderTotal(order), 0),
        orderCount: committed.length,
        bySupplier: [...bySupplier.entries()].map(([label, value]) => ({ label, value: round(value, 0) })).sort((a, b) => b.value - a.value),
        byMonth: [...byMonth.entries()].map(([label, value]) => ({ label, spend: round(value, 0) })),
        byStatus: statuses.map((status) => ({ label: STATUS_META[status].label, value: rows.filter((item) => item.status === status).length })),
        rows,
      };
    },
  },
  {
    method: "GET",
    pattern: "/search",
    handler: ({ query }) => {
      const db = getDb();
      const term = query.q ?? "";
      if (term.trim().length < 2) return { products: [], suppliers: [], purchaseOrders: [] };
      return {
        products: db.products
          .filter((item) => matchesSearch(term, [item.name, item.sku, item.barcode]))
          .slice(0, 5)
          .map((item) => ({ id: item.id, title: item.name, subtitle: `${item.sku} · ${enrichProduct(item).totalStock} ${item.unit} on hand` })),
        suppliers: db.suppliers
          .filter((item) => matchesSearch(term, [item.name, item.code, item.contactPerson]))
          .slice(0, 5)
          .map((item) => ({ id: item.id, title: item.name, subtitle: `${item.code} · ${item.contactPerson}` })),
        purchaseOrders: db.purchaseOrders
          .map(enrichPurchaseOrder)
          .filter((item) => matchesSearch(term, [item.poNumber, item.supplierName]))
          .slice(0, 5)
          .map((item) => ({ id: item.id, title: item.poNumber, subtitle: `${item.supplierName} · ${STATUS_META[item.status].label}` })),
      };
    },
  },
];
