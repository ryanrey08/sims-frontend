import type { Permission } from "@/constants/permissions";

export type ID = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

// Catalog ------------------------------------------------------------------------

export interface Category extends Timestamps {
  id: ID;
  code: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  /** Derived */
  productCount?: number;
}

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface Product extends Timestamps {
  id: ID;
  sku: string;
  name: string;
  description: string;
  categoryId: ID;
  unit: string;
  unitCost: number;
  reorderLevel: number;
  reorderQuantity: number;
  preferredSupplierId: ID | null;
  barcode?: string;
  status: "active" | "discontinued";
  /** Derived */
  categoryName?: string;
  supplierName?: string | null;
  totalStock?: number;
  stockValue?: number;
  stockStatus?: StockStatus;
}

export interface Supplier extends Timestamps {
  id: ID;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  tin?: string;
  paymentTerms: string;
  leadTimeDays: number;
  status: "active" | "inactive";
  /** Derived */
  orderCount?: number;
  totalPurchased?: number;
}

export interface Warehouse extends Timestamps {
  id: ID;
  code: string;
  name: string;
  type: "main" | "branch" | "storeroom";
  address: string;
  manager: string;
  phone: string;
  status: "active" | "inactive";
  /** Derived */
  itemCount?: number;
  totalUnits?: number;
  stockValue?: number;
}

// Inventory ------------------------------------------------------------------------

export interface StockLevel {
  id: ID;
  productId: ID;
  warehouseId: ID;
  quantity: number;
  updatedAt: string;
  /** Derived */
  sku?: string;
  productName?: string;
  categoryName?: string;
  unit?: string;
  unitCost?: number;
  reorderLevel?: number;
  warehouseName?: string;
  value?: number;
  stockStatus?: StockStatus;
}

export type MovementType = "receipt" | "issue" | "adjustment-in" | "adjustment-out" | "transfer-in" | "transfer-out";

export interface StockMovement {
  id: ID;
  reference: string;
  type: MovementType;
  productId: ID;
  warehouseId: ID;
  /** Always positive; direction comes from `type`. */
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  reason: string;
  performedBy: string;
  createdAt: string;
  sourceType?: "purchase-order" | "requisition" | "adjustment" | "transfer";
  sourceId?: ID;
  /** Derived */
  sku?: string;
  productName?: string;
  unit?: string;
  warehouseName?: string;
}

// Procurement ------------------------------------------------------------------------

export type PurchaseOrderStatus = "draft" | "pending" | "approved" | "partially-received" | "received" | "cancelled";

export interface PurchaseOrderItem {
  productId: ID;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  /** Derived */
  sku?: string;
  productName?: string;
  unit?: string;
}

export interface PurchaseOrder extends Timestamps {
  id: ID;
  poNumber: string;
  supplierId: ID;
  warehouseId: ID;
  orderDate: string;
  expectedDate: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  notes?: string;
  createdBy: string;
  approvedBy?: string | null;
  /** Derived */
  supplierName?: string;
  warehouseName?: string;
  total?: number;
  itemCount?: number;
}

export type RequisitionStatus = "pending" | "approved" | "rejected" | "issued" | "cancelled";

export interface RequisitionItem {
  productId: ID;
  quantity: number;
  issuedQuantity: number;
  /** Derived */
  sku?: string;
  productName?: string;
  unit?: string;
  available?: number;
}

export interface Requisition extends Timestamps {
  id: ID;
  reqNumber: string;
  department: string;
  requestedBy: string;
  warehouseId: ID;
  neededBy: string;
  purpose: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: RequisitionStatus;
  items: RequisitionItem[];
  remarks?: string;
  /** Derived */
  warehouseName?: string;
  itemCount?: number;
}

// Administration ------------------------------------------------------------------------

export interface Role extends Timestamps {
  id: ID;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  /** Derived */
  userCount?: number;
}

export interface PermissionDefinition {
  key: Permission;
  module: string;
  label: string;
}

export interface User extends Timestamps {
  id: ID;
  name: string;
  email: string;
  roleId: ID;
  department: string;
  status: "active" | "inactive";
  lastLoginAt: string | null;
  /** Derived */
  roleName?: string;
}

export interface AuthUser {
  id: ID;
  name: string;
  email: string;
  roleId: ID;
  roleName: string;
  department: string;
  permissions: Permission[];
}

export interface SystemSettings {
  organizationName: string;
  address: string;
  email: string;
  phone: string;
  currency: string;
  poPrefix: string;
  requisitionPrefix: string;
  defaultWarehouseId: ID;
  lowStockAlerts: boolean;
  requirePoApproval: boolean;
  updatedAt: string;
}

export type NotificationType = "info" | "success" | "warning" | "danger";
export interface AppNotification {
  id: ID;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: ID;
  actor: string;
  action: string;
  target: string;
  module: string;
  createdAt: string;
}

// Insights ------------------------------------------------------------------------

export interface ChartPoint {
  label: string;
  [series: string]: string | number;
}

export interface DashboardSummary {
  totals: {
    products: number;
    inventoryValue: number;
    totalUnits: number;
    lowStock: number;
    outOfStock: number;
    pendingPurchaseOrders: number;
    pendingRequisitions: number;
    activeSuppliers: number;
  };
  movementTrend: ChartPoint[];
  valueByCategory: ChartPoint[];
  stockStatus: ChartPoint[];
  lowStockItems: Product[];
  recentMovements: StockMovement[];
}

export interface ValuationReport {
  totalValue: number;
  totalUnits: number;
  byCategory: ChartPoint[];
  byWarehouse: ChartPoint[];
  rows: StockLevel[];
}

export interface MovementReport {
  daily: ChartPoint[];
  byType: ChartPoint[];
  totals: { inbound: number; outbound: number; net: number };
  rows: StockMovement[];
}

export interface PurchasingReport {
  totalSpend: number;
  orderCount: number;
  bySupplier: ChartPoint[];
  byMonth: ChartPoint[];
  byStatus: ChartPoint[];
  rows: PurchaseOrder[];
}
