/** Permission keys shared by navigation, route guards and role management. */
export const PERMISSIONS = {
  dashboardView: "dashboard.view",
  productsView: "products.view",
  productsManage: "products.manage",
  suppliersView: "suppliers.view",
  suppliersManage: "suppliers.manage",
  warehousesView: "warehouses.view",
  warehousesManage: "warehouses.manage",
  inventoryView: "inventory.view",
  inventoryAdjust: "inventory.adjust",
  purchasingView: "purchasing.view",
  purchasingManage: "purchasing.manage",
  purchasingApprove: "purchasing.approve",
  requisitionsView: "requisitions.view",
  requisitionsCreate: "requisitions.create",
  requisitionsApprove: "requisitions.approve",
  reportsView: "reports.view",
  usersView: "users.view",
  usersManage: "users.manage",
  rolesManage: "roles.manage",
  settingsManage: "settings.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.view": "View dashboard",
  "products.view": "View products and categories",
  "products.manage": "Create, edit and delete products and categories",
  "suppliers.view": "View suppliers",
  "suppliers.manage": "Create, edit and delete suppliers",
  "warehouses.view": "View warehouses",
  "warehouses.manage": "Create, edit and delete warehouses",
  "inventory.view": "View stock levels and movements",
  "inventory.adjust": "Adjust, transfer and receive stock",
  "purchasing.view": "View purchase orders",
  "purchasing.manage": "Create and edit purchase orders",
  "purchasing.approve": "Approve or cancel purchase orders",
  "requisitions.view": "View supply requisitions",
  "requisitions.create": "Submit supply requisitions",
  "requisitions.approve": "Approve, reject and issue requisitions",
  "reports.view": "View and export reports",
  "users.view": "View users",
  "users.manage": "Create, edit and deactivate users",
  "roles.manage": "Manage roles and permissions",
  "settings.manage": "Manage system settings",
};
