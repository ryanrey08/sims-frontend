import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Monitor,
  Package,
  RotateCcw,
  Settings2,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@/constants/permissions";
import type { FieldDef } from "./masterData";

/**
 * - stock: product + quantity (+ unit cost)
 * - count: product + system quantity + counted quantity
 * - property: property record (+ condition)
 */
export type ItemMode = "stock" | "count" | "property";

/** Extra item columns shown on the mockup transaction forms. */
export type ItemColumn =
  | "available"
  | "currentStock"
  | "newStock"
  | "poQty"
  | "receivedQty"
  | "rejectedQty"
  | "unitCost"
  | "amount"
  | "remarks"
  | "condition";

export type CardAccent = "blue" | "green" | "yellow" | "pink" | "purple";

export interface DocumentCard {
  label: string;
  icon: LucideIcon;
  accent: CardAccent;
  /** Display statuses counted by the card (see `displayStatus`); omit for all documents. */
  statuses?: string[];
  /** Count documents whose type field (e.g. RIS / ICS / PAR) starts with this value. */
  typePrefix?: string;
  /** Count documents dated this month. */
  thisMonth?: boolean;
}

export interface ListColumn {
  field: string;
  label: string;
  /** warehouse: code + name stacked; person: icon + name; type: coloured pill. */
  kind?: "warehouse" | "person" | "type" | "text" | "date";
}

export interface DocumentUi {
  /** Page title, e.g. "Receiving (GRN)"; `titleNote` renders after it in regular weight. */
  title: string;
  titleNote?: string;
  subtitle: string;
  numberLabel: string;
  newLabel: string;
  infoTitle: string;
  itemsTitle: string;
  /** Title of the right-hand card holding `group: "side"` fields. */
  sideTitle?: string;
  quantityLabel: string;
  itemColumns: ItemColumn[];
  cards: DocumentCard[];
  listColumns: ListColumn[];
  /** inline: "Status [All]" toolbar (warehouse screens); stacked: labels above + red Search button. */
  filterStyle: "inline" | "stacked";
  /** Label for posted documents (e.g. Completed for transfers). */
  postedLabel?: string;
  /** Tabs / type pills driven by a select field (Issuance RIS / ICS / PAR). */
  typeField?: string;
  /** Pink "Total Amount" summary box under the items. */
  showAmount: boolean;
  /** Item lookups and availability come from this warehouse field. */
  warehouseField?: string;
}

export interface DocumentDef {
  key: string;
  title: string;
  singular: string;
  /** Government form name shown on the document, e.g. "Requisition and Issue Slip (RIS)". */
  formName?: string;
  prefix: string;
  /** Number prefix taken from the first word of this field's value (RIS / ICS / PAR). */
  prefixField?: string;
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
  ui: DocumentUi;
}

const WAREHOUSE: FieldDef = { name: "warehouseId", label: "Warehouse", type: "select", optionsFrom: "warehouses", required: true, list: true };
const THREE_STEP = ["Warehouse Head", "Supply Officer", "Property Custodian"];
const STANDARD_CARDS = (total: string): DocumentCard[] => [
  { label: total, icon: FileText, accent: "blue" },
  { label: "Completed", icon: CheckCircle2, accent: "green", statuses: ["posted", "completed"] },
  { label: "For Approval", icon: Clock, accent: "yellow", statuses: ["pending", "in-transit"] },
  { label: "Returned / Cancelled", icon: XCircle, accent: "pink", statuses: ["rejected", "cancelled"] },
];

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
      { name: "fromWarehouseId", label: "From Warehouse", type: "select", optionsFrom: "warehouses", required: true, list: true },
      { name: "toWarehouseId", label: "To Warehouse", type: "select", optionsFrom: "warehouses", required: true, list: true },
      { name: "requestedBy", label: "Requestor", type: "text", required: true, list: true },
      { name: "transferType", label: "Transfer Type", type: "select", options: ["Inter-warehouse", "Replenishment", "Return to Main"], required: true },
      { name: "expectedDate", label: "Expected Transfer Date", type: "date" },
      { name: "referenceNo", label: "Reference No.", type: "text" },
    ],
    ui: {
      title: "Stock Transfer",
      subtitle: "Transfer inventory items between warehouses, with approval and tracking.",
      numberLabel: "Transfer No.",
      newLabel: "New Stock Transfer",
      infoTitle: "Transfer Information",
      itemsTitle: "Transfer Items",
      quantityLabel: "Transfer Qty",
      itemColumns: ["available", "remarks"],
      cards: [
        { label: "Total Transfers", icon: FileText, accent: "blue" },
        { label: "Completed", icon: CheckCircle2, accent: "green", statuses: ["completed"] },
        { label: "In Transit", icon: Clock, accent: "yellow", statuses: ["pending", "in-transit"] },
        { label: "Cancelled", icon: XCircle, accent: "pink", statuses: ["cancelled", "rejected"] },
      ],
      listColumns: [
        { field: "fromWarehouseId", label: "From Warehouse", kind: "warehouse" },
        { field: "toWarehouseId", label: "To Warehouse", kind: "warehouse" },
      ],
      filterStyle: "inline",
      postedLabel: "completed",
      showAmount: false,
      warehouseField: "fromWarehouseId",
    },
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
      { name: "adjustmentType", label: "Adjustment Type", type: "select", options: ["Stock In (Add)", "Stock Out (Deduct)"], required: true, list: true },
      { name: "referenceNo", label: "Reference No.", type: "text" },
      WAREHOUSE,
      { name: "reason", label: "Reason / Adjustment Category", type: "select", options: ["Inventory Count Variance", "Damaged / Expired", "Found Stock", "Data Entry Correction", "Others"], required: true, list: true },
      { name: "description", label: "Adjustment Description", type: "textarea" },
      { name: "preparedBy", label: "Prepared By", type: "text", required: true, list: true },
      { name: "department", label: "Department", type: "text" },
    ],
    ui: {
      title: "Stock Adjustment",
      subtitle: "Create a stock adjustment to add, deduct, or correct inventory quantity.",
      numberLabel: "Adjustment No.",
      newLabel: "New Adjustment",
      infoTitle: "Adjustment Information",
      itemsTitle: "Adjustment Items",
      quantityLabel: "Adjustment Qty",
      itemColumns: ["currentStock", "newStock", "remarks"],
      cards: STANDARD_CARDS("Total Adjustments"),
      listColumns: [
        { field: "warehouseId", label: "Warehouse", kind: "warehouse" },
        { field: "adjustmentType", label: "Adjustment Type", kind: "type" },
        { field: "reason", label: "Reason" },
      ],
      filterStyle: "inline",
      showAmount: false,
      warehouseField: "warehouseId",
    },
  },
  {
    key: "receiving",
    title: "Receiving (GRN)",
    singular: "goods receipt",
    formName: "Goods Receipt Notice (GRN)",
    prefix: "GRN",
    module: "transactions",
    description: "Record the receipt of items from a supplier based on a Purchase Order (PO).",
    itemMode: "stock",
    approvals: ["Inspection Officer", "Supply Officer"],
    effect: "Adds the accepted quantities to the receiving warehouse.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      { name: "supplierId", label: "Supplier", type: "select", optionsFrom: "suppliers", required: true, list: true },
      { name: "poNumber", label: "PO Reference", type: "text", required: true, list: true },
      { name: "invoiceNo", label: "Delivery Receipt (DR) No.", type: "text" },
      WAREHOUSE,
      { name: "inspectedBy", label: "Received By", type: "text", required: true, list: true },
    ],
    ui: {
      title: "Receiving (GRN)",
      titleNote: "– Goods Receipt Notice",
      subtitle: "Record the receipt of items from a supplier based on a Purchase Order (PO).",
      numberLabel: "GRN No.",
      newLabel: "New Receiving (GRN)",
      infoTitle: "Receiving Details",
      itemsTitle: "Item Details",
      sideTitle: "Supplier Information",
      quantityLabel: "Accepted Qty",
      itemColumns: ["poQty", "receivedQty", "rejectedQty", "unitCost", "amount"],
      cards: STANDARD_CARDS("Total Receipts"),
      listColumns: [
        { field: "supplierId", label: "Supplier" },
        { field: "poNumber", label: "PO Reference" },
        { field: "warehouseId", label: "Warehouse", kind: "warehouse" },
      ],
      filterStyle: "stacked",
      showAmount: true,
      warehouseField: "warehouseId",
    },
  },
  {
    key: "issuances",
    title: "Issuance (RIS/ICS/PAR)",
    singular: "issuance",
    formName: "Requisition and Issue Transaction",
    prefix: "RIS",
    prefixField: "issuanceType",
    module: "transactions",
    description: "Process and record the release of items to requesting units (RIS), internal consumption (ICS), or property assignment (PAR).",
    itemMode: "stock",
    approvals: ["Supply Officer", "Approving Officer"],
    effect: "Deducts the issued quantities from the warehouse.",
    viewPermission: PERMISSIONS.requisitionsView,
    createPermission: PERMISSIONS.requisitionsCreate,
    approvePermission: PERMISSIONS.requisitionsApprove,
    fields: [
      { name: "issuanceType", label: "Issuance Type", type: "select", options: ["RIS – Requisition and Issue Slip", "ICS – Internal Consumption Slip", "PAR – Property Assignment Receipt"], required: true, list: true },
      { name: "referenceNo", label: "Reference No.", type: "text", required: true, list: true, placeholder: "PR-2026-00311" },
      { name: "office", label: "Requesting Unit / Department", type: "text", required: true, list: true },
      { name: "dateRequested", label: "Date Requested", type: "date", required: true },
      WAREHOUSE,
      { name: "purpose", label: "Purpose / Remarks", type: "textarea", required: true },
      { name: "requestedBy", label: "Requested By", type: "text", required: true, group: "side" },
      { name: "requestedDesignation", label: "Designation", type: "text", group: "side" },
      { name: "approvedBy", label: "Approved By", type: "text", required: true, group: "side" },
      { name: "approvedDesignation", label: "Designation", type: "text", group: "side" },
    ],
    ui: {
      title: "Issuance (RIS/ICS/PAR)",
      titleNote: "– Requisition and Issue Transaction",
      subtitle: "Process and record the release of items to requesting units (RIS), internal consumption (ICS), or property assignment (PAR).",
      numberLabel: "Issuance No.",
      newLabel: "New Issuance",
      infoTitle: "Issuance Details",
      itemsTitle: "Item Details",
      sideTitle: "Requestor Information",
      quantityLabel: "Quantity to Issue",
      itemColumns: ["available", "unitCost", "amount"],
      cards: [
        { label: "Total Issuances", icon: FileText, accent: "blue" },
        { label: "RIS (Requisition)", icon: Package, accent: "green", typePrefix: "RIS" },
        { label: "ICS (Consumption)", icon: Settings2, accent: "yellow", typePrefix: "ICS" },
        { label: "PAR (Property Assignment)", icon: Monitor, accent: "purple", typePrefix: "PAR" },
      ],
      listColumns: [
        { field: "issuanceType", label: "Type", kind: "type" },
        { field: "referenceNo", label: "Reference No." },
        { field: "office", label: "Requesting Unit / Department" },
      ],
      filterStyle: "stacked",
      typeField: "issuanceType",
      showAmount: true,
      warehouseField: "warehouseId",
    },
  },
  {
    key: "purchase-requests",
    title: "Purchase Request (PR)",
    singular: "purchase request",
    formName: "Purchase Request (PR)",
    prefix: "PR",
    module: "transactions",
    description: "Request for the procurement of items, supplies, and equipment needed for operations.",
    itemMode: "stock",
    approvals: ["Department Head", "Procurement", "Finance"],
    effect: "The approved PR is released to Procurement for purchasing.",
    viewPermission: PERMISSIONS.purchasingView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.purchasingApprove,
    fields: [
      { name: "department", label: "Department", type: "text", required: true, list: true },
      { name: "prType", label: "PR Type", type: "select", options: ["Regular PR", "Emergency PR", "Reorder PR"], required: true },
      { name: "costCenter", label: "Cost Center", type: "select", options: ["ADM-001 – General Administration", "OPS-002 – Operations", "ICT-003 – ICT Services", "ACA-004 – Academic Affairs"], required: true },
      { name: "procurementMode", label: "Procurement Mode", type: "select", options: ["Shopping", "Small Value Procurement", "Public Bidding", "Direct Contracting"], required: true },
      { name: "projectCode", label: "Project Code", type: "text" },
      { name: "priority", label: "Priority", type: "select", options: ["Low", "Normal", "High", "Urgent"], required: true, list: true },
      { name: "requiredDate", label: "Required Date", type: "date", required: true },
      { name: "warehouseId", label: "Delivery Location", type: "select", optionsFrom: "warehouses", required: true },
      { name: "requestedBy", label: "Requested By", type: "text", required: true, group: "side" },
      { name: "position", label: "Position", type: "text", group: "side" },
      { name: "contactNo", label: "Contact No.", type: "text", group: "side" },
      { name: "email", label: "Email", type: "text", group: "side" },
    ],
    ui: {
      title: "Purchase Request (PR)",
      subtitle: "Request for the procurement of items, supplies, and equipment needed for operations.",
      numberLabel: "PR No.",
      newLabel: "Create Purchase Request (PR)",
      infoTitle: "PR Information",
      itemsTitle: "PR Items",
      sideTitle: "Requester Details",
      quantityLabel: "Requested Qty",
      itemColumns: ["available", "unitCost", "amount"],
      cards: [
        { label: "Total PR", icon: FileText, accent: "blue" },
        { label: "Approved", icon: CheckCircle2, accent: "green", statuses: ["posted"] },
        { label: "For Approval", icon: Clock, accent: "yellow", statuses: ["pending"] },
        { label: "Returned / Cancelled", icon: XCircle, accent: "pink", statuses: ["rejected", "cancelled"] },
      ],
      listColumns: [
        { field: "department", label: "Department" },
        { field: "priority", label: "Priority", kind: "type" },
        { field: "requiredDate", label: "Required Date", kind: "date" },
      ],
      filterStyle: "stacked",
      postedLabel: "approved",
      showAmount: true,
      warehouseField: "warehouseId",
    },
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
    ui: {
      title: "Return",
      subtitle: "Return unused or excess supplies to the warehouse.",
      numberLabel: "Return No.",
      newLabel: "New Return",
      infoTitle: "Return Details",
      itemsTitle: "Item Details",
      quantityLabel: "Return Qty",
      itemColumns: ["unitCost", "amount", "remarks"],
      cards: STANDARD_CARDS("Total Returns"),
      listColumns: [
        { field: "warehouseId", label: "Warehouse", kind: "warehouse" },
        { field: "returnedBy", label: "Returned By", kind: "person" },
        { field: "reason", label: "Reason" },
      ],
      filterStyle: "stacked",
      showAmount: true,
      warehouseField: "warehouseId",
    },
  },
  {
    key: "physical-counts",
    title: "Stock Count",
    singular: "stock count",
    formName: "Report on the Physical Count of Inventories (RPCI)",
    prefix: "CNT",
    module: "transactions",
    description: "Conduct and manage physical inventory counts to verify actual stock against system records.",
    itemMode: "count",
    approvals: ["Supply Officer", "Property Custodian"],
    effect: "Posts the variance between counted and system quantities as adjustments.",
    viewPermission: PERMISSIONS.inventoryView,
    createPermission: PERMISSIONS.inventoryAdjust,
    approvePermission: PERMISSIONS.inventoryApprove,
    fields: [
      WAREHOUSE,
      { name: "countType", label: "Count Type", type: "select", options: ["Full Count", "Cycle Count", "Spot Count"], required: true, list: true },
      { name: "description", label: "Count Description", type: "textarea", required: true, list: true },
      { name: "reference", label: "Reference (Optional)", type: "text" },
      { name: "countedBy", label: "Assigned To", type: "text", required: true },
    ],
    ui: {
      title: "Stock Count",
      subtitle: "Conduct and manage physical inventory counts to verify actual stock against system records.",
      numberLabel: "Count No.",
      newLabel: "New Stock Count",
      infoTitle: "Count Information",
      itemsTitle: "Count Items",
      quantityLabel: "Actual Count Qty",
      itemColumns: ["remarks"],
      cards: [
        { label: "Total Stock Count", icon: FileText, accent: "blue" },
        { label: "Completed", icon: CheckCircle2, accent: "green", statuses: ["completed", "posted"] },
        { label: "In Progress", icon: Hourglass, accent: "yellow", statuses: ["draft", "in-progress"] },
        { label: "Variance", icon: TriangleAlert, accent: "pink", statuses: ["variance"] },
        { label: "This Month", icon: CalendarDays, accent: "purple", thisMonth: true },
      ],
      listColumns: [
        { field: "warehouseId", label: "Warehouse", kind: "warehouse" },
        { field: "countType", label: "Count Type", kind: "type" },
        { field: "description", label: "Description" },
      ],
      filterStyle: "inline",
      postedLabel: "completed",
      showAmount: false,
      warehouseField: "warehouseId",
    },
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
    ui: {
      title: "Stock Reconciliation",
      subtitle: "Reconcile stock cards with the inventory ledger and correct differences.",
      numberLabel: "Reconciliation No.",
      newLabel: "New Reconciliation",
      infoTitle: "Reconciliation Details",
      itemsTitle: "Reconciliation Items",
      quantityLabel: "Actual Qty",
      itemColumns: ["remarks"],
      cards: STANDARD_CARDS("Total Reconciliations"),
      listColumns: [
        { field: "warehouseId", label: "Warehouse", kind: "warehouse" },
        { field: "period", label: "Period" },
        { field: "reconciledBy", label: "Reconciled By", kind: "person" },
      ],
      filterStyle: "stacked",
      postedLabel: "completed",
      showAmount: false,
      warehouseField: "warehouseId",
    },
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
    ui: {
      title: "Property Assignment",
      subtitle: "Assign property to an accountable officer.",
      numberLabel: "PAR No.",
      newLabel: "New Assignment",
      infoTitle: "Assignment Details",
      itemsTitle: "Property Items",
      quantityLabel: "Qty",
      itemColumns: ["condition", "unitCost", "remarks"],
      cards: STANDARD_CARDS("Total Assignments"),
      listColumns: [
        { field: "employeeId", label: "Accountable Officer", kind: "person" },
        { field: "formType", label: "Form", kind: "type" },
      ],
      filterStyle: "stacked",
      showAmount: true,
    },
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
    ui: {
      title: "Property Transfer",
      subtitle: "Transfer property and accountability between officers.",
      numberLabel: "PTR No.",
      newLabel: "New Property Transfer",
      infoTitle: "Transfer Details",
      itemsTitle: "Property Items",
      quantityLabel: "Qty",
      itemColumns: ["condition", "unitCost", "remarks"],
      cards: STANDARD_CARDS("Total Transfers"),
      listColumns: [
        { field: "fromEmployeeId", label: "From", kind: "person" },
        { field: "toEmployeeId", label: "To", kind: "person" },
      ],
      filterStyle: "stacked",
      showAmount: true,
    },
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
    ui: {
      title: "Property Return",
      subtitle: "Return property from an accountable officer to the property office.",
      numberLabel: "PRS No.",
      newLabel: "New Property Return",
      infoTitle: "Return Details",
      itemsTitle: "Property Items",
      quantityLabel: "Qty",
      itemColumns: ["condition", "unitCost", "remarks"],
      cards: STANDARD_CARDS("Total Returns"),
      listColumns: [
        { field: "employeeId", label: "Returned By", kind: "person" },
        { field: "reason", label: "Reason" },
      ],
      filterStyle: "stacked",
      showAmount: true,
    },
  },
  {
    key: "property-disposals",
    title: "Property Disposal",
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
    ui: {
      title: "Property Disposal",
      subtitle: "Dispose of unserviceable, lost, stolen, damaged or destroyed property.",
      numberLabel: "Disposal No.",
      newLabel: "New Disposal",
      infoTitle: "Disposal Details",
      itemsTitle: "Property Items",
      quantityLabel: "Qty",
      itemColumns: ["condition", "unitCost", "remarks"],
      cards: [
        { label: "Total Disposals", icon: FileText, accent: "blue" },
        { label: "Disposed", icon: Ban, accent: "green", statuses: ["posted"] },
        { label: "For Approval", icon: Clock, accent: "yellow", statuses: ["pending"] },
        { label: "Returned", icon: RotateCcw, accent: "pink", statuses: ["rejected", "cancelled"] },
      ],
      listColumns: [
        { field: "disposalType", label: "Disposal Type", kind: "type" },
        { field: "inspectedBy", label: "Inspected By", kind: "person" },
      ],
      filterStyle: "stacked",
      showAmount: true,
    },
  },
];

export function getDocumentDef(key: string) {
  return DOCUMENTS.find((item) => item.key === key);
}

/**
 * Status shown in lists and badges. Transfers that have cleared at least one approval
 * are "In Transit"; posted transfers and counts read "Completed".
 */
export function displayStatus(def: DocumentDef, doc: { status: string; approvals: { status: string }[]; items?: { quantity: number }[] }) {
  if (doc.status === "posted") return def.ui.postedLabel ?? "posted";
  if (def.key === "stock-transfers" && doc.status === "pending" && doc.approvals.some((step) => step.status === "approved")) return "in-transit";
  // Stock counts awaiting approval read "Variance" when any line differs from the system quantity.
  if (def.key === "physical-counts" && doc.status === "pending") return doc.items?.some((item) => item.quantity !== 0) ? "variance" : "in-progress";
  return doc.status;
}

/** Document number prefix, e.g. ICS for an issuance whose type is "ICS – Internal Consumption Slip". */
export function documentPrefix(def: DocumentDef, fields: Record<string, unknown>) {
  if (!def.prefixField) return def.prefix;
  const value = String(fields[def.prefixField] ?? "").split(/\s/)[0];
  return /^[A-Z]{2,5}$/.test(value) ? value : def.prefix;
}

