import { PERMISSIONS, type Permission } from "@/constants/permissions";

export type ReportFilter = "warehouseId" | "productId" | "supplierId" | "employeeId" | "propertyId" | "from" | "to";

export interface ReportFormDef {
  code: string;
  title: string;
  group: "Inventory Transactions" | "Inventory Management" | "Inventory Monitoring" | "Property Management" | "Monitoring";
  description: string;
  filters: ReportFilter[];
  /** Filters that must be chosen before the report can be generated. */
  required?: ReportFilter[];
  permission: Permission;
}

/** Government forms, monitoring views and reports listed in the SIMS design. Rendered by the API as tables. */
export const REPORT_FORMS: ReportFormDef[] = [
  { code: "iar", title: "Inspection and Acceptance Report", group: "Inventory Transactions", description: "Deliveries inspected and accepted.", filters: ["supplierId", "warehouseId", "from", "to"], permission: PERMISSIONS.reportsView },
  { code: "raaf", title: "Report for Accountability for Accountable Forms", group: "Inventory Transactions", description: "Serial numbers of accountable forms issued in the period.", filters: ["from", "to"], permission: PERMISSIONS.reportsView },
  { code: "supplier-ledger", title: "Supplier Ledger Card", group: "Inventory Management", description: "Purchases and deliveries per supplier.", filters: ["supplierId", "from", "to"], required: ["supplierId"], permission: PERMISSIONS.reportsView },
  { code: "stock-card", title: "Stock Card", group: "Inventory Management", description: "Receipts, issues and running balance of an item.", filters: ["productId", "warehouseId"], required: ["productId"], permission: PERMISSIONS.reportsView },
  { code: "inventory-ledger", title: "Inventory Ledger", group: "Inventory Management", description: "Quantity and value movements per item with running cost.", filters: ["productId", "warehouseId"], required: ["productId"], permission: PERMISSIONS.reportsView },
  { code: "ics", title: "Inventory Custodian Slip", group: "Inventory Management", description: "Semi-expendable items issued to end users.", filters: ["employeeId"], permission: PERMISSIONS.reportsView },
  { code: "ris", title: "Requisition and Issue Slip", group: "Inventory Management", description: "Supplies requested and issued.", filters: ["warehouseId", "from", "to"], permission: PERMISSIONS.reportsView },
  { code: "rsmi", title: "Report of Supplies and Materials Issued", group: "Inventory Management", description: "Summary of supplies issued in the period.", filters: ["warehouseId", "from", "to"], permission: PERMISSIONS.reportsView },
  { code: "wmr", title: "Waste Materials Report", group: "Inventory Management", description: "Damaged, expired and wasted supplies written off.", filters: ["warehouseId", "from", "to"], permission: PERMISSIONS.reportsView },
  { code: "rpci", title: "Report on the Physical Count of Inventories", group: "Inventory Management", description: "Balance per card vs. on-hand count.", filters: ["warehouseId"], permission: PERMISSIONS.reportsView },
  { code: "low-stock", title: "Low Stock Alerts", group: "Inventory Monitoring", description: "Items at or below reorder level.", filters: ["warehouseId"], permission: PERMISSIONS.monitoringView },
  { code: "reorder", title: "Reorder Level Monitoring", group: "Inventory Monitoring", description: "Suggested reorder quantities and preferred suppliers.", filters: ["warehouseId"], permission: PERMISSIONS.monitoringView },
  { code: "valuation", title: "Inventory Valuation", group: "Inventory Monitoring", description: "Quantity × unit cost per item and warehouse.", filters: ["warehouseId"], permission: PERMISSIONS.monitoringView },
  { code: "stock-aging", title: "Stock Aging", group: "Inventory Monitoring", description: "Days since each item last moved.", filters: ["warehouseId"], permission: PERMISSIONS.monitoringView },
  { code: "movement-history", title: "Inventory Movement History", group: "Inventory Monitoring", description: "All stock movements in the period.", filters: ["warehouseId", "productId", "from", "to"], permission: PERMISSIONS.monitoringView },
  { code: "property-card", title: "Property Card", group: "Property Management", description: "History of a property item: receipt, assignment, transfer, disposal.", filters: ["propertyId"], required: ["propertyId"], permission: PERMISSIONS.reportsView },
  { code: "par", title: "Property Acknowledgement Receipt", group: "Property Management", description: "PPE assigned to accountable officers.", filters: ["employeeId"], permission: PERMISSIONS.reportsView },
  { code: "rpcppe", title: "Report on the Physical Count of Property, Plant and Equipment", group: "Property Management", description: "PPE balance per card vs. on-hand.", filters: [], permission: PERMISSIONS.reportsView },
  { code: "iirup", title: "Inventory and Inspection Report of Unserviceable Property", group: "Property Management", description: "Unserviceable property for disposal.", filters: [], permission: PERMISSIONS.reportsView },
  { code: "rlsddp", title: "Report of Lost, Stolen, Damaged, Destroyed Property", group: "Property Management", description: "Property reported lost, stolen, damaged or destroyed.", filters: [], permission: PERMISSIONS.reportsView },
  { code: "ptr", title: "Property Transfer Report", group: "Property Management", description: "Property transferred between accountable officers.", filters: ["from", "to"], permission: PERMISSIONS.reportsView },
  { code: "ppe-ledger", title: "Property, Plant and Equipment Ledger Card with Depreciation", group: "Property Management", description: "Straight-line depreciation schedule per property.", filters: ["propertyId"], required: ["propertyId"], permission: PERMISSIONS.reportsView },
  { code: "audit-trail", title: "Audit Trail and Activity Log", group: "Monitoring", description: "Who did what, and when.", filters: ["from", "to"], permission: PERMISSIONS.monitoringView },
];

export function getReportForm(code: string) {
  return REPORT_FORMS.find((item) => item.code === code);
}
