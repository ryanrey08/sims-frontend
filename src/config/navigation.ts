import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Warehouse,
} from "lucide-react";
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

/**
 * Sidebar navigation, following the module structure of the SIMS Canva mockups.
 * Items are hidden when the user lacks the permission.
 */
export const NAVIGATION: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.dashboardView },
      {
        label: "Warehouse Management",
        href: "/warehouses",
        icon: Warehouse,
        permission: PERMISSIONS.warehousesView,
        children: [
          { label: "Multiple Warehouse", href: "/warehouses", permission: PERMISSIONS.warehousesView },
          { label: "Stock Management", href: "/inventory", permission: PERMISSIONS.inventoryView },
          { label: "Stock Transfer", href: "/inventory/transfer", permission: PERMISSIONS.inventoryAdjust },
          { label: "Stock Movement", href: "/inventory/movements", permission: PERMISSIONS.inventoryView },
          { label: "Stock Adjustment", href: "/inventory/adjust", permission: PERMISSIONS.inventoryAdjust },
        ],
      },
      {
        label: "Inventory Transactions",
        href: "/purchase-orders",
        icon: ArrowLeftRight,
        permission: PERMISSIONS.purchasingView,
        children: [
          { label: "Purchase & Receiving", href: "/purchase-orders", permission: PERMISSIONS.purchasingView },
          { label: "Issuance & Distribution", href: "/requisitions", permission: PERMISSIONS.requisitionsView },
        ],
      },
      {
        label: "Inventory Management",
        href: "/products",
        icon: Boxes,
        permission: PERMISSIONS.productsView,
        children: [
          { label: "Item Master", href: "/products", permission: PERMISSIONS.productsView },
          { label: "Item Categories", href: "/categories", permission: PERMISSIONS.productsView },
          { label: "Suppliers", href: "/suppliers", permission: PERMISSIONS.suppliersView },
        ],
      },
      { label: "Reports", href: "/reports", icon: BarChart3, permission: PERMISSIONS.reportsView },
      {
        label: "Monitoring",
        href: "/notifications",
        icon: Activity,
        children: [{ label: "Alerts & Notifications", href: "/notifications" }],
      },
      {
        label: "Administration",
        href: "/users",
        icon: Settings,
        permission: PERMISSIONS.usersView,
        children: [
          { label: "Users", href: "/users", permission: PERMISSIONS.usersView },
          { label: "Roles & Permissions", href: "/roles", permission: PERMISSIONS.rolesManage },
          { label: "System Settings", href: "/settings", permission: PERMISSIONS.settingsManage },
        ],
      },
    ],
  },
];

/** Readable labels for static route segments, used by breadcrumbs. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Item Master",
  categories: "Item Categories",
  inventory: "Stock Management",
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
  { pattern: /^\/inventory/, permission: PERMISSIONS.inventoryView },
  { pattern: /^\/warehouses\/(new|[^/]+\/edit)/, permission: PERMISSIONS.warehousesManage },
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
