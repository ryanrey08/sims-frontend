import { PERMISSIONS, type Permission } from "@/constants/permissions";
import type { FieldDef } from "./masterData";

/**
 * - stock: product + quantity (+ unit cost)
 * - count: product + system quantity + counted quantity
 * - property: property record (+ condition)
 */
export type ItemMode = "stock" | "count" | "property";

export interface DocumentDef {
  key: string;
  title: string;
  singular: string;
  /** Government form name shown on the document, e.g. "Requisition and Issue Slip (RIS)". */
  formName?: string;
  prefix: string;
  module: "warehouse" | "transactions" | "property";
  description: string;
  fields: FieldDef[];
  itemMode: ItemMode;
  /** Ordered approvers. The document posts when the last step approves. */
  approvals: string[];
  /** What happens to stock/property when the document posts. */
  effect: string;
  viewPermission: Permission;
  createPermission: Permission;
  approvePermission: Permission;
}

const WAREHOUSE: FieldDef = { name: "warehouseId", label: "Warehouse", type: "select", optionsFrom: "warehouses", required: true, list: true };
const THREE_STEP = ["Warehouse Head", "Supply Officer", "Property Custodian"];

export const DOCUMENTS: DocumentDef[] = [
  {
    key: "stock-transfers",
    title: "Stock Transfer",
    singular: "stock transfer",
    prefix: "ST",
    module: "warehouse",
    description: "Transfer inventory items between warehouses, with approval and tracking.",
    itemMode: "stock",
    approvals: THREE_STEP,
    effect: "Moves stock from the source to the destination warehouse when fully approved.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      { name: "transferType", label: "Transfer Type", type: "select", options: ["Inter-warehouse", "Replenishment", "Return to Main"], required: true },
      { name: "fromWarehouseId", label: "From Warehouse", type: "select", optionsFrom: "warehouses", required: true, list: true },
      { name: "toWarehouseId", label: "To Warehouse", type: "select", optionsFrom: "warehouses", required: true, list: true },
      { name: "expectedDate", label: "Expected Delivery", type: "date" },
      { name: "requestedBy", label: "Requested By", type: "text", required: true, list: true },
      { name: "referenceNo", label: "Reference No.", type: "text" },
    ],
  },
  {
    key: "stock-adjustments",
    title: "Stock Adjustment",
    singular: "stock adjustment",
    prefix: "ADJ",
    module: "warehouse",
    description: "Create a stock adjustment to add, deduct, or correct inventory quantity.",
    itemMode: "stock",
    approvals: THREE_STEP,
    effect: "Adds or deducts stock in the warehouse when fully approved.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      WAREHOUSE,
      { name: "adjustmentType", label: "Adjustment Type", type: "select", options: ["Stock In (Add)", "Stock Out (Deduct)"], required: true, list: true },
      { name: "reason", label: "Reason / Category", type: "select", options: ["Inventory Count Variance", "Damaged / Expired", "Found Stock", "Data Entry Correction", "Others"], required: true, list: true },
      { name: "preparedBy", label: "Prepared By", type: "text", required: true },
      { name: "department", label: "Department", type: "text" },
    ],
  },
  {
    key: "receiving",
    title: "Receiving and Inspection",
    singular: "receiving report",
    formName: "Inspection and Acceptance Report (IAR)",
    prefix: "IAR",
    module: "transactions",
    description: "Record deliveries, inspect them and accept items into stock.",
    itemMode: "stock",
    approvals: ["Inspection Officer", "Supply Officer"],
    effect: "Adds the accepted quantities to the receiving warehouse.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      { name: "supplierId", label: "Supplier", type: "select", optionsFrom: "suppliers", required: true, list: true },
      WAREHOUSE,
      { name: "poNumber", label: "PO No.", type: "text", list: true },
      { name: "invoiceNo", label: "Invoice / DR No.", type: "text", required: true },
      { name: "inspectedBy", label: "Inspection Officer", type: "text", required: true },
    ],
  },
  {
    key: "issuances",
    title: "Issuance and Distribution",
    singular: "issuance",
    formName: "Requisition and Issue Slip (RIS)",
    prefix: "RIS",
    module: "transactions",
    description: "Issue supplies to offices and end users.",
    itemMode: "stock",
    approvals: ["Supply Officer", "Approving Officer"],
    effect: "Deducts the issued quantities from the warehouse.",
    viewPermission: PERMISSIONS.requisitionsView,
    createPermission: PERMISSIONS.requisitionsCreate,
    approvePermission: PERMISSIONS.requisitionsApprove,
    fields: [
      WAREHOUSE,
      { name: "office", label: "Office / Division", type: "text", required: true, list: true },
      { name: "responsibilityCenter", label: "Responsibility Center Code", type: "text" },
      { name: "purpose", label: "Purpose", type: "text", required: true },
      { name: "requestedBy", label: "Requested By", type: "text", required: true, list: true },
    ],
  },
  {
    key: "returns",
    title: "Returns",
    singular: "return",
    prefix: "RET",
    module: "transactions",
    description: "Return unused or excess supplies to the warehouse.",
    itemMode: "stock",
    approvals: ["Supply Officer"],
    effect: "Adds the returned quantities back to the warehouse.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      WAREHOUSE,
      { name: "returnedBy", label: "Returned By", type: "text", required: true, list: true },
      { name: "office", label: "Office", type: "text", list: true },
      { name: "reason", label: "Reason", type: "select", options: ["Excess", "Unused", "Wrong Item", "Defective"], required: true, list: true },
    ],
  },
  {
    key: "physical-counts",
    title: "Physical Inventory",
    singular: "physical count",
    formName: "Report on the Physical Count of Inventories (RPCI)",
    prefix: "PC",
    module: "transactions",
    description: "Record physical counts and post variances against system quantities.",
    itemMode: "count",
    approvals: ["Inventory Committee", "Supply Officer"],
    effect: "Posts the variance between counted and system quantities as adjustments.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      WAREHOUSE,
      { name: "countDate", label: "As of Date", type: "date", required: true, list: true },
      { name: "countedBy", label: "Counted By", type: "text", required: true, list: true },
    ],
  },
  {
    key: "reconciliations",
    title: "Stock Reconciliation",
    singular: "reconciliation",
    prefix: "REC",
    module: "transactions",
    description: "Reconcile stock cards with the inventory ledger and correct differences.",
    itemMode: "count",
    approvals: ["Accounting", "Supply Officer"],
    effect: "Posts reconciled differences as adjustments.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      WAREHOUSE,
      { name: "period", label: "Period", type: "text", required: true, list: true, placeholder: "November 2026" },
      { name: "reconciledBy", label: "Reconciled By", type: "text", required: true, list: true },
    ],
  },
  {
    key: "property-assignments",
    title: "Property Assignment",
    singular: "property assignment",
    formName: "Property Acknowledgement Receipt (PAR) / Inventory Custodian Slip (ICS)",
    prefix: "PAR",
    module: "property",
    description: "Assign property to an accountable officer.",
    itemMode: "property",
    approvals: ["Property Custodian"],
    effect: "Sets the accountable officer and marks the property as assigned.",
    viewPermission: PERMISSIONS.propertyView,
    createPermission: PERMISSIONS.propertyManage,
    approvePermission: PERMISSIONS.propertyApprove,
    fields: [
      { name: "employeeId", label: "Accountable Officer", type: "select", optionsFrom: "employees", required: true, list: true },
      { name: "formType", label: "Form", type: "select", options: ["PAR", "ICS"], required: true, list: true },
      { name: "fundCluster", label: "Fund Cluster", type: "text" },
    ],
  },
  {
    key: "property-transfers",
    title: "Property Transfer",
    singular: "property transfer",
    formName: "Property Transfer Report (PTR)",
    prefix: "PTR",
    module: "property",
    description: "Transfer property and accountability between officers.",
    itemMode: "property",
    approvals: ["Property Custodian", "Approving Officer"],
    effect: "Moves accountability to the receiving officer.",
    viewPermission: PERMISSIONS.propertyView,
    createPermission: PERMISSIONS.propertyManage,
    approvePermission: PERMISSIONS.propertyApprove,
    fields: [
      { name: "fromEmployeeId", label: "From Accountable Officer", type: "select", optionsFrom: "employees", required: true, list: true },
      { name: "toEmployeeId", label: "To Accountable Officer", type: "select", optionsFrom: "employees", required: true, list: true },
      { name: "transferType", label: "Transfer Type", type: "select", options: ["Donation", "Relocate", "Reassignment", "Others"], required: true },
      { name: "reason", label: "Reason for Transfer", type: "text", required: true },
    ],
  },
  {
    key: "property-returns",
    title: "Property Return",
    singular: "property return",
    formName: "Property Return Slip (PRS)",
    prefix: "PRS",
    module: "property",
    description: "Return property from an accountable officer to the property office.",
    itemMode: "property",
    approvals: ["Property Custodian"],
    effect: "Clears accountability and marks the property as available.",
    viewPermission: PERMISSIONS.propertyView,
    createPermission: PERMISSIONS.propertyManage,
    approvePermission: PERMISSIONS.propertyApprove,
    fields: [
      { name: "employeeId", label: "Returned By", type: "select", optionsFrom: "employees", required: true, list: true },
      { name: "reason", label: "Reason", type: "select", options: ["Resignation / Retirement", "No Longer Needed", "For Repair", "Unserviceable"], required: true, list: true },
    ],
  },
  {
    key: "property-disposals",
    title: "Property Disposal and Condemnation",
    singular: "disposal",
    formName: "Inventory and Inspection Report of Unserviceable Property (IIRUP)",
    prefix: "IIRUP",
    module: "property",
    description: "Dispose of unserviceable, lost, stolen, damaged or destroyed property.",
    itemMode: "property",
    approvals: ["Inspection Committee", "Property Custodian", "Head of Agency"],
    effect: "Marks the property as disposed (or lost) and removes accountability.",
    viewPermission: PERMISSIONS.propertyView,
    createPermission: PERMISSIONS.propertyManage,
    approvePermission: PERMISSIONS.propertyApprove,
    fields: [
      { name: "disposalType", label: "Disposal Type", type: "select", options: ["Condemnation / Destruction", "Sale", "Transfer", "Lost / Stolen", "Damaged / Destroyed"], required: true, list: true },
      { name: "appraisedValue", label: "Appraised Value", type: "currency" },
      { name: "inspectedBy", label: "Inspected By", type: "text", required: true },
    ],
  },
];

export function getDocumentDef(key: string) {
  return DOCUMENTS.find((item) => item.key === key);
}
