import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
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

/** Sidebar navigation. Items are hidden when the user lacks the permission. */
export const NAVIGATION: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.dashboardView }],
  },
  {
    title: "Inventory",
    items: [
      {
        label: "Products",
        href: "/products",
        icon: Package,
        permission: PERMISSIONS.productsView,
        children: [
          { label: "All products", href: "/products", permission: PERMISSIONS.productsView },
          { label: "Categories", href: "/categories", permission: PERMISSIONS.productsView },
        ],
      },
      {
        label: "Stock",
        href: "/inventory",
        icon: Boxes,
        permission: PERMISSIONS.inventoryView,
        children: [
          { label: "Stock levels", href: "/inventory", permission: PERMISSIONS.inventoryView },
          { label: "Stock movements", href: "/inventory/movements", permission: PERMISSIONS.inventoryView },
          { label: "Adjust stock", href: "/inventory/adjust", permission: PERMISSIONS.inventoryAdjust },
          { label: "Transfer stock", href: "/inventory/transfer", permission: PERMISSIONS.inventoryAdjust },
        ],
      },
      { label: "Warehouses", href: "/warehouses", icon: Warehouse, permission: PERMISSIONS.warehousesView },
    ],
  },
  {
    title: "Procurement",
    items: [
      { label: "Suppliers", href: "/suppliers", icon: Truck, permission: PERMISSIONS.suppliersView },
      { label: "Purchase orders", href: "/purchase-orders", icon: ShoppingCart, permission: PERMISSIONS.purchasingView },
      { label: "Requisitions", href: "/requisitions", icon: ClipboardList, permission: PERMISSIONS.requisitionsView },
    ],
  },
  {
    title: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3, permission: PERMISSIONS.reportsView }],
  },
  {
    title: "Administration",
    items: [
      { label: "Users", href: "/users", icon: Users, permission: PERMISSIONS.usersView },
      { label: "Roles & permissions", href: "/roles", icon: ShieldCheck, permission: PERMISSIONS.rolesManage },
      { label: "Settings", href: "/settings", icon: Settings, permission: PERMISSIONS.settingsManage },
    ],
  },
  {
    title: "Account",
    items: [{ label: "My profile", href: "/profile", icon: UserCog }],
  },
];

/** Readable labels for static route segments, used by breadcrumbs. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
  inventory: "Stock",
  movements: "Stock movements",
  adjust: "Adjust stock",
  transfer: "Transfer stock",
  warehouses: "Warehouses",
  suppliers: "Suppliers",
  "purchase-orders": "Purchase orders",
  requisitions: "Requisitions",
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
