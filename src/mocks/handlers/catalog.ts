import { PERMISSIONS } from "@/constants/permissions";
import type { Category, Product, Supplier, Warehouse } from "@/types/models";
import { getDb, newId, nowISO, persistDb } from "../database/db";
import { logActivityEntry } from "./activity";
import {
  enrichCategory,
  enrichMovement,
  enrichProduct,
  enrichPurchaseOrder,
  enrichStockLevel,
  enrichSupplier,
  enrichWarehouse,
} from "./relations";
import {
  applyFilters,
  assertUnique,
  bodyOf,
  conflict,
  listResponse,
  matchesSearch,
  notFound,
  requireFields,
  requirePermission,
  validationFailed,
  type MockRoute,
} from "./utils";

const find = <T extends { id: string }>(items: T[], id: string, label: string) => items.find((item) => item.id === id) ?? notFound(label);
const stamp = () => {
  const timestamp = nowISO();
  return { createdAt: timestamp, updatedAt: timestamp };
};

function validateProduct(body: Partial<Product>, id?: string) {
  requireFields(body as Record<string, unknown>, ["sku", "name", "categoryId", "unit", "unitCost", "reorderLevel", "reorderQuantity"]);
  const db = getDb();
  assertUnique(db.products, "sku", body.sku, id, "This SKU is already used by another product.");
  if (body.barcode) assertUnique(db.products, "barcode", body.barcode, id, "This barcode is already assigned.");
  if (!db.categories.some((item) => item.id === body.categoryId)) validationFailed({ categoryId: ["Select a valid category."] });
  if ((body.unitCost ?? 0) < 0) validationFailed({ unitCost: ["Unit cost cannot be negative."] });
}

export const catalogRoutes: MockRoute[] = [
  // Products ----------------------------------------------------------------------
  {
    method: "GET",
    pattern: "/products",
    handler: ({ query }) => {
      const warehouseId = query.warehouseId || undefined;
      const items = applyFilters(getDb().products, query, ["status", "categoryId", "preferredSupplierId", "unit"])
        .filter((item) => matchesSearch(query.search, [item.sku, item.name, item.barcode]))
        .map((item) => enrichProduct(item, warehouseId))
        .filter((item) => !query.stockStatus || query.stockStatus === "all" || item.stockStatus === query.stockStatus);
      return listResponse(items, { sortBy: "name", ...query });
    },
  },
  { method: "GET", pattern: "/products/:id", handler: ({ params }) => enrichProduct(find(getDb().products, params.id, "Product")) },
  {
    method: "GET",
    pattern: "/products/:id/stock",
    handler: ({ params }) => getDb().stockLevels.filter((item) => item.productId === params.id).map(enrichStockLevel),
  },
  {
    method: "GET",
    pattern: "/products/:id/movements",
    handler: ({ params, query }) =>
      getDb()
        .movements.filter((item) => item.productId === params.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Number(query.limit) || 20)
        .map(enrichMovement),
  },
  {
    method: "POST",
    pattern: "/products",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.productsManage);
      const body = bodyOf<Partial<Product>>(request);
      validateProduct(body);
      const product = { preferredSupplierId: null, ...body, id: newId("product"), status: body.status ?? "active", ...stamp() } as Product;
      getDb().products.unshift(product);
      logActivityEntry(request, "added product", product.name, "Products");
      persistDb();
      return enrichProduct(product);
    },
  },
  {
    method: "PUT",
    pattern: "/products/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.productsManage);
      const product = find(getDb().products, request.params.id, "Product");
      const body = bodyOf<Partial<Product>>(request);
      validateProduct({ ...product, ...body }, product.id);
      Object.assign(product, body, { id: product.id, updatedAt: nowISO() });
      logActivityEntry(request, "updated product", product.name, "Products");
      persistDb();
      return enrichProduct(product);
    },
  },
  {
    method: "PATCH",
    pattern: "/products/:id/status",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.productsManage);
      const product = find(getDb().products, request.params.id, "Product");
      product.status = bodyOf<{ status: Product["status"] }>(request).status;
      product.updatedAt = nowISO();
      logActivityEntry(request, `marked ${product.status}`, product.name, "Products");
      persistDb();
      return enrichProduct(product);
    },
  },
  {
    method: "DELETE",
    pattern: "/products/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.productsManage);
      const db = getDb();
      const product = find(db.products, request.params.id, "Product");
      if (db.movements.some((item) => item.productId === product.id)) {
        conflict("This product has stock history. Mark it as discontinued instead of deleting it.");
      }
      db.products = db.products.filter((item) => item.id !== product.id);
      db.stockLevels = db.stockLevels.filter((item) => item.productId !== product.id);
      logActivityEntry(request, "deleted product", product.name, "Products");
      persistDb();
      return { message: "Product deleted." };
    },
  },

  // Categories ----------------------------------------------------------------------
  {
    method: "GET",
    pattern: "/categories",
    handler: ({ query }) => {
      const items = applyFilters(getDb().categories, query, ["status"])
        .filter((item) => matchesSearch(query.search, [item.code, item.name, item.description]))
        .map(enrichCategory);
      return listResponse(items, { sortBy: "name", ...query });
    },
  },
  { method: "GET", pattern: "/categories/:id", handler: ({ params }) => enrichCategory(find(getDb().categories, params.id, "Category")) },
  {
    method: "POST",
    pattern: "/categories",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.productsManage);
      const body = bodyOf<Partial<Category>>(request);
      requireFields(body as Record<string, unknown>, ["code", "name"]);
      const db = getDb();
      assertUnique(db.categories, "code", body.code, undefined, "This category code already exists.");
      assertUnique(db.categories, "name", body.name, undefined, "A category with this name already exists.");
      const category = { description: "", ...body, id: newId("category"), status: body.status ?? "active", ...stamp() } as Category;
      db.categories.push(category);
      logActivityEntry(request, "added category", category.name, "Products");
      persistDb();
      return enrichCategory(category);
    },
  },
  {
    method: "PUT",
    pattern: "/categories/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.productsManage);
      const db = getDb();
      const category = find(db.categories, request.params.id, "Category");
      const body = bodyOf<Partial<Category>>(request);
      assertUnique(db.categories, "code", body.code ?? category.code, category.id, "This category code already exists.");
      assertUnique(db.categories, "name", body.name ?? category.name, category.id, "A category with this name already exists.");
      Object.assign(category, body, { id: category.id, updatedAt: nowISO() });
      persistDb();
      return enrichCategory(category);
    },
  },
  {
    method: "DELETE",
    pattern: "/categories/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.productsManage);
      const db = getDb();
      const category = find(db.categories, request.params.id, "Category");
      if (db.products.some((item) => item.categoryId === category.id)) conflict("Move or delete this category's products first.");
      db.categories = db.categories.filter((item) => item.id !== category.id);
      persistDb();
      return { message: "Category deleted." };
    },
  },

  // Suppliers ----------------------------------------------------------------------
  {
    method: "GET",
    pattern: "/suppliers",
    handler: ({ query }) => {
      const items = applyFilters(getDb().suppliers, query, ["status", "paymentTerms"])
        .filter((item) => matchesSearch(query.search, [item.code, item.name, item.contactPerson, item.email]))
        .map(enrichSupplier);
      return listResponse(items, { sortBy: "name", ...query });
    },
  },
  { method: "GET", pattern: "/suppliers/:id", handler: ({ params }) => enrichSupplier(find(getDb().suppliers, params.id, "Supplier")) },
  {
    method: "GET",
    pattern: "/suppliers/:id/purchase-orders",
    handler: ({ params }) =>
      getDb()
        .purchaseOrders.filter((item) => item.supplierId === params.id)
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
        .map(enrichPurchaseOrder),
  },
  {
    method: "GET",
    pattern: "/suppliers/:id/products",
    handler: ({ params }) => getDb().products.filter((item) => item.preferredSupplierId === params.id).map((item) => enrichProduct(item)),
  },
  {
    method: "POST",
    pattern: "/suppliers",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.suppliersManage);
      const body = bodyOf<Partial<Supplier>>(request);
      requireFields(body as Record<string, unknown>, ["code", "name", "contactPerson", "email", "phone", "paymentTerms"]);
      const db = getDb();
      assertUnique(db.suppliers, "code", body.code, undefined, "This supplier code already exists.");
      assertUnique(db.suppliers, "name", body.name, undefined, "A supplier with this name already exists.");
      const supplier = { ...body, id: newId("supplier"), status: body.status ?? "active", ...stamp() } as Supplier;
      db.suppliers.unshift(supplier);
      logActivityEntry(request, "added supplier", supplier.name, "Suppliers");
      persistDb();
      return enrichSupplier(supplier);
    },
  },
  {
    method: "PUT",
    pattern: "/suppliers/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.suppliersManage);
      const db = getDb();
      const supplier = find(db.suppliers, request.params.id, "Supplier");
      const body = bodyOf<Partial<Supplier>>(request);
      assertUnique(db.suppliers, "code", body.code ?? supplier.code, supplier.id, "This supplier code already exists.");
      assertUnique(db.suppliers, "name", body.name ?? supplier.name, supplier.id, "A supplier with this name already exists.");
      Object.assign(supplier, body, { id: supplier.id, updatedAt: nowISO() });
      logActivityEntry(request, "updated supplier", supplier.name, "Suppliers");
      persistDb();
      return enrichSupplier(supplier);
    },
  },
  {
    method: "PATCH",
    pattern: "/suppliers/:id/status",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.suppliersManage);
      const supplier = find(getDb().suppliers, request.params.id, "Supplier");
      supplier.status = bodyOf<{ status: Supplier["status"] }>(request).status;
      supplier.updatedAt = nowISO();
      persistDb();
      return enrichSupplier(supplier);
    },
  },
  {
    method: "DELETE",
    pattern: "/suppliers/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.suppliersManage);
      const db = getDb();
      const supplier = find(db.suppliers, request.params.id, "Supplier");
      if (db.purchaseOrders.some((item) => item.supplierId === supplier.id)) {
        conflict("This supplier has purchase orders. Deactivate it instead of deleting it.");
      }
      db.suppliers = db.suppliers.filter((item) => item.id !== supplier.id);
      db.products.forEach((product) => {
        if (product.preferredSupplierId === supplier.id) product.preferredSupplierId = null;
      });
      logActivityEntry(request, "deleted supplier", supplier.name, "Suppliers");
      persistDb();
      return { message: "Supplier deleted." };
    },
  },

  // Warehouses ----------------------------------------------------------------------
  {
    method: "GET",
    pattern: "/warehouses",
    handler: ({ query }) => {
      const items = applyFilters(getDb().warehouses, query, ["status", "type"])
        .filter((item) => matchesSearch(query.search, [item.code, item.name, item.address, item.manager]))
        .map(enrichWarehouse);
      return listResponse(items, { sortBy: "code", ...query });
    },
  },
  { method: "GET", pattern: "/warehouses/:id", handler: ({ params }) => enrichWarehouse(find(getDb().warehouses, params.id, "Warehouse")) },
  {
    method: "POST",
    pattern: "/warehouses",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.warehousesManage);
      const body = bodyOf<Partial<Warehouse>>(request);
      requireFields(body as Record<string, unknown>, ["code", "name", "type", "address", "manager"]);
      const db = getDb();
      assertUnique(db.warehouses, "code", body.code, undefined, "This warehouse code already exists.");
      const warehouse = { phone: "", ...body, id: newId("warehouse"), status: body.status ?? "active", ...stamp() } as Warehouse;
      db.warehouses.push(warehouse);
      logActivityEntry(request, "added warehouse", warehouse.name, "Warehouses");
      persistDb();
      return enrichWarehouse(warehouse);
    },
  },
  {
    method: "PUT",
    pattern: "/warehouses/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.warehousesManage);
      const db = getDb();
      const warehouse = find(db.warehouses, request.params.id, "Warehouse");
      const body = bodyOf<Partial<Warehouse>>(request);
      assertUnique(db.warehouses, "code", body.code ?? warehouse.code, warehouse.id, "This warehouse code already exists.");
      if (body.status === "inactive" && enrichWarehouse(warehouse).totalUnits) {
        validationFailed({ status: ["Transfer remaining stock out before deactivating this warehouse."] });
      }
      Object.assign(warehouse, body, { id: warehouse.id, updatedAt: nowISO() });
      logActivityEntry(request, "updated warehouse", warehouse.name, "Warehouses");
      persistDb();
      return enrichWarehouse(warehouse);
    },
  },
  {
    method: "DELETE",
    pattern: "/warehouses/:id",
    handler: (request) => {
      requirePermission(request, PERMISSIONS.warehousesManage);
      const db = getDb();
      const warehouse = find(db.warehouses, request.params.id, "Warehouse");
      if (db.movements.some((item) => item.warehouseId === warehouse.id)) {
        conflict("This warehouse has stock history. Deactivate it instead of deleting it.");
      }
      db.warehouses = db.warehouses.filter((item) => item.id !== warehouse.id);
      persistDb();
      return { message: "Warehouse deleted." };
    },
  },
];
