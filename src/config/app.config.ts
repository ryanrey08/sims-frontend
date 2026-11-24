/** Centralized, non-secret application configuration. */
export const appConfig = {
  name: "SIMS – Supply & Inventory Management System",
  shortName: "SIMS",
  tagline: "Supply & Inventory Management",
  description: "Track products, stock levels, warehouses, suppliers, purchase orders and supply requisitions.",
  logoSrc: "/logo/logo.svg",
  currency: "PHP",
  locale: "en-PH",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50],
  units: ["pcs", "box", "pack", "ream", "set", "bottle", "gallon", "roll", "kg", "liter"],
  departments: ["Administration", "Finance", "Human Resources", "IT", "Operations", "Facilities", "Sales", "Logistics"],
  paymentTerms: ["COD", "Net 15", "Net 30", "Net 45", "Net 60"],
} as const;
