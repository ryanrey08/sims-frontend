import {
  Activity,
  ArrowLeftRight,
  Boxes,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Warehouse,
} from "lucide-react";
import { getDocumentDef } from "./documents";
import { getMasterData } from "./masterData";
import { getReportForm } from "./reportForms";
import { PERMISSIONS, type Permission } from "@/constants/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  permission?: Permission;
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const P = PERMISSIONS;
const doc = (key: string, label: string, permission: Permission): NavItem => ({ label, href: `/documents/${key}`, permission });
const form = (code: string, label: string, permission: Permission = P.reportsView): NavItem => ({ label, href: `/forms/${code}`, permission });

/**
 * Sidebar navigation, matching the menu tree drawn in the SIMS Canva mockups.
 * Items are hidden when the user lacks the permission.
 */
export const NAVIGATION: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: P.dashboardView },
      {
        label: "Warehouse Management",
        href: "/warehouses",
        icon: Warehouse,
        permission: P.warehousesView,
        children: [
          { label: "Multiple Warehouse", href: "/warehouses", permission: P.warehousesView },
          { label: "Warehouse Locations", href: "/warehouses/locations", permission: P.warehousesView },
          doc("stock-transfers", "Stock Transfer", P.inventoryView),
          { label: "Stock Movement", href: "/inventory/movements", permission: P.inventoryView },
          { label: "Stock Management", href: "/inventory", permission: P.inventoryView },
        ],
      },
      {
        label: "Inventory Transactions",
        href: "/transactions",
        icon: ArrowLeftRight,
        permission: P.inventoryView,
        children: [
          { label: "Inventory Transaction", href: "/transactions", permission: P.inventoryView },
          doc("receiving", "Receiving (GRN)", P.inventoryView),
          doc("issuances", "Issuance (RIS/ICS/PAR)", P.requisitionsView),
          doc("stock-adjustments", "Adjustment", P.inventoryView),
          doc("returns", "Return", P.inventoryView),
          doc("physical-counts", "Physical Inventory", P.inventoryView),
          doc("reconciliations", "Stock Reconciliation", P.inventoryView),
        ],
      },
      {
        label: "Inventory Management",
        href: "/inventory/overview",
        icon: Boxes,
        permission: P.productsView,
        children: [
          { label: "Inventory Management", href: "/inventory/overview", permission: P.productsView },
          { label: "Item Master", href: "/products", permission: P.productsView },
          { label: "Stock Inquiry", href: "/inventory/inquiry", permission: P.inventoryView },
          { label: "Reorder Management", href: "/inventory/reorder", permission: P.inventoryView },
          { label: "Barcode / QR Management", href: "/inventory/labels", permission: P.productsView },
        ],
      },
      {
        label: "Property Management",
        href: "/property",
        icon: Landmark,
        permission: P.propertyView,
        children: [
          { label: "Property Management", href: "/property", permission: P.propertyView },
          { label: "Property Transactions", href: "/property/transactions", permission: P.propertyView },
          { label: "Property Master", href: "/property/master", permission: P.propertyView },
          { label: "Maintenance", href: "/property/maintenance", permission: P.propertyView },
          { label: "Disposal / Transfer", href: "/property/disposal", permission: P.propertyView },
          { label: "Property Reports", href: "/property/reports", permission: P.reportsView },
        ],
      },
      {
        label: "Reports",
        href: "/forms",
        icon: FileSpreadsheet,
        permission: P.reportsView,
        children: [
          { label: "Forms and Reports", href: "/forms", permission: P.reportsView },
          { label: "Report Generation", href: "/reports", permission: P.reportsView },
        ],
      },
      {
        label: "Monitoring",
        href: "/forms/low-stock",
        icon: Activity,
        permission: P.monitoringView,
        children: [
          form("low-stock", "Low Stock Alerts", P.monitoringView),
          form("reorder", "Reorder Level Monitoring", P.monitoringView),
          form("valuation", "Inventory Valuation", P.monitoringView),
          form("stock-aging", "Stock Aging", P.monitoringView),
          form("movement-history", "Inventory Movement History", P.monitoringView),
          form("audit-trail", "Audit Trail and Activity Log", P.monitoringView),
          { label: "Notifications", href: "/notifications" },
        ],
      },
      {
        label: "Administration",
        href: "/users",
        icon: Settings,
        permission: P.usersView,
        children: [
          { label: "Users", href: "/users", permission: P.usersView },
          { label: "Roles & Permissions", href: "/roles", permission: P.rolesManage },
          { label: "Employees / Custodians", href: "/masters/employees", permission: P.propertyView },
          { label: "Suppliers", href: "/suppliers", permission: P.suppliersView },
          { label: "Purchase Orders", href: "/purchase-orders", permission: P.purchasingView },
          { label: "Supply Requests", href: "/requisitions", permission: P.requisitionsView },
          { label: "System Settings", href: "/settings", permission: P.settingsManage },
        ],
      },
    ],
  },
];

/** Readable labels for static route segments, used by breadcrumbs. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Item Master",
  "purchase-requests": "Purchase Request (PR)",
  categories: "Item Categories",
  inventory: "Stock Management",
  transactions: "Inventory Transactions",
  overview: "Inventory Management",
  inquiry: "Stock Inquiry",
  reorder: "Reorder Management",
  property: "Property Management",
  master: "Property Master",
  maintenance: "Maintenance",
  disposal: "Disposal / Transfer",
  locations: "Warehouse Locations",
  movements: "Stock movements",
  adjust: "Adjust stock",
  transfer: "Transfer stock",
  warehouses: "Warehouse Management",
  suppliers: "Suppliers",
  "purchase-orders": "Purchase & Receiving",
  requisitions: "Issuance & Requests",
  reports: "Reports",
  users: "Users",
  roles: "Roles & permissions",
  settings: "Settings",
  profile: "My profile",
  notifications: "Notifications",
  documents: "Transactions",
  masters: "Registries",
  forms: "Forms and Reports",
  labels: "Barcode / QR Management",
  new: "New",
  edit: "Edit",
};

/**
 * Route access rules checked by the dashboard shell. First match wins, so
 * specific rules (create/edit pages) come before module-wide rules.
 */
const ROUTE_RULES: { pattern: RegExp; permission: Permission }[] = [
  { pattern: /^\/dashboard/, permission: PERMISSIONS.dashboardView },
  { pattern: /^\/products\/(new|[^/]+\/edit)/, permission: PERMISSIONS.productsManage },
  { pattern: /^\/(products|categories)/, permission: PERMISSIONS.productsView },
  { pattern: /^\/inventory\/(adjust|transfer)/, permission: PERMISSIONS.inventoryAdjust },
  { pattern: /^\/inventory\/labels/, permission: PERMISSIONS.productsView },
  { pattern: /^\/forms/, permission: PERMISSIONS.reportsView },
  { pattern: /^\/inventory/, permission: PERMISSIONS.inventoryView },
  { pattern: /^\/warehouses\/locations/, permission: PERMISSIONS.warehousesView },
  { pattern: /^\/warehouses\/(new|[^/]+\/edit)/, permission: PERMISSIONS.warehousesManage },
  { pattern: /^\/transactions/, permission: PERMISSIONS.inventoryView },
  { pattern: /^\/inventory\/(inquiry|reorder)/, permission: PERMISSIONS.inventoryView },
  { pattern: /^\/inventory\/overview/, permission: PERMISSIONS.productsView },
  { pattern: /^\/property\/reports/, permission: PERMISSIONS.reportsView },
  { pattern: /^\/property/, permission: PERMISSIONS.propertyView },
  { pattern: /^\/warehouses/, permission: PERMISSIONS.warehousesView },
  { pattern: /^\/suppliers\/(new|[^/]+\/edit)/, permission: PERMISSIONS.suppliersManage },
  { pattern: /^\/suppliers/, permission: PERMISSIONS.suppliersView },
  { pattern: /^\/purchase-orders\/(new|[^/]+\/edit)/, permission: PERMISSIONS.purchasingManage },
  { pattern: /^\/purchase-orders/, permission: PERMISSIONS.purchasingView },
  { pattern: /^\/requisitions\/new/, permission: PERMISSIONS.requisitionsCreate },
  { pattern: /^\/requisitions/, permission: PERMISSIONS.requisitionsView },
  { pattern: /^\/reports/, permission: PERMISSIONS.reportsView },
  { pattern: /^\/users\/(new|[^/]+\/edit)/, permission: PERMISSIONS.usersManage },
  { pattern: /^\/users/, permission: PERMISSIONS.usersView },
  { pattern: /^\/roles/, permission: PERMISSIONS.rolesManage },
  { pattern: /^\/settings/, permission: PERMISSIONS.settingsManage },
];

export function requiredPermissionFor(pathname: string): Permission | undefined {
  const [, section, key, sub, action] = pathname.split("/");
  // Config-driven modules carry their own permissions.
  if (section === "documents" && key) {
    const def = getDocumentDef(key);
    if (def) return sub === "new" || action === "edit" ? def.createPermission : def.viewPermission;
  }
  if (section === "masters" && key) return getMasterData(key)?.viewPermission;
  if (section === "forms" && key) return getReportForm(key)?.permission;
  return ROUTE_RULES.find((rule) => rule.pattern.test(pathname))?.permission;
}

/** Where to send a user after sign-in: the first page they are allowed to see. */
export function firstAllowedPath(can: (permission?: Permission) => boolean) {
  for (const section of NAVIGATION) {
    for (const item of section.items) {
      if (can(item.permission)) return item.href;
    }
  }
  return "/profile";
}
