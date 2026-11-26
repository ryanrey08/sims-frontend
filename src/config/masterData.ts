import { PERMISSIONS, type Permission } from "@/constants/permissions";

export type FieldType = "text" | "number" | "currency" | "select" | "date" | "textarea" | "checkbox";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Static options for selects. */
  options?: string[];
  /** Options loaded from another resource: master-data key, or "warehouses" / "products". */
  optionsFrom?: string;
  /** Show as a column in the list table. */
  list?: boolean;
  /** Must be unique across records (validated by the API). */
  unique?: boolean;
  placeholder?: string;
  hint?: string;
  /** Transaction forms: "side" fields render in the right-hand information card. */
  group?: "main" | "side";
  /** Span both columns of a two-column form. */
  wide?: boolean;
}

export interface MasterDataDef {
  key: string;
  title: string;
  singular: string;
  description: string;
  /** Field used as the record's display name. */
  labelField: string;
  codeField: string;
  fields: FieldDef[];
  viewPermission: Permission;
  managePermission: Permission;
}

const STATUS: FieldDef = { name: "status", label: "Status", type: "select", options: ["active", "inactive"], required: true, list: true };

/** Master-data registries from the SIMS design. The UI and the mock API are both driven by these. */
export const MASTER_DATA: MasterDataDef[] = [
  {
    key: "locations",
    title: "Warehouse Locations",
    singular: "location",
    description: "Define and manage storage locations within each warehouse (e.g., building, zone, aisle, rack, bin).",
    labelField: "name",
    codeField: "code",
    viewPermission: PERMISSIONS.warehousesView,
    managePermission: PERMISSIONS.warehousesManage,
    fields: [
      { name: "code", label: "Location Code", type: "text", required: true, list: true, unique: true, placeholder: "LOC-007" },
      { name: "name", label: "Location Name", type: "text", required: true, list: true },
      { name: "warehouseId", label: "Warehouse", type: "select", optionsFrom: "warehouses", required: true, list: true },
      { name: "type", label: "Type", type: "select", options: ["Area", "Rack", "Bin", "Shelf", "Cold Storage"], required: true, list: true },
      { name: "zone", label: "Zone", type: "select", options: ["RCV", "A", "B", "C", "D"], list: true },
      { name: "rack", label: "Rack", type: "text", list: true },
      { name: "bin", label: "Bin", type: "text", list: true },
      { name: "capacity", label: "Capacity", type: "number", list: true },
      { name: "uom", label: "UoM", type: "select", options: ["pcs", "box", "pallet", "kg", "liter"] },
      { name: "description", label: "Location Description", type: "textarea" },
      STATUS,
    ],
  },
  {
    key: "item-classifications",
    title: "Item Classification",
    singular: "classification",
    description: "Classify items as supplies, semi-expendable property or PPE for accounting and reporting.",
    labelField: "name",
    codeField: "code",
    viewPermission: PERMISSIONS.productsView,
    managePermission: PERMISSIONS.productsManage,
    fields: [
      { name: "code", label: "Code", type: "text", required: true, list: true, unique: true },
      { name: "name", label: "Classification", type: "text", required: true, list: true },
      { name: "accountCode", label: "UACS / Account Code", type: "text", list: true },
      { name: "nature", label: "Nature", type: "select", options: ["Consumable", "Semi-Expendable", "PPE"], required: true, list: true },
      { name: "description", label: "Description", type: "textarea" },
      STATUS,
    ],
  },
  {
    key: "units",
    title: "Unit of Measure",
    singular: "unit of measure",
    description: "Standard units used for items, with conversion to the base unit.",
    labelField: "name",
    codeField: "code",
    viewPermission: PERMISSIONS.productsView,
    managePermission: PERMISSIONS.productsManage,
    fields: [
      { name: "code", label: "Code", type: "text", required: true, list: true, unique: true, placeholder: "pcs" },
      { name: "name", label: "Unit Name", type: "text", required: true, list: true },
      { name: "baseUnit", label: "Base Unit", type: "text", list: true },
      { name: "conversion", label: "Conversion to Base", type: "number", list: true, hint: "How many base units make one of this unit." },
      STATUS,
    ],
  },
  {
    key: "property-classifications",
    title: "Property Classification",
    singular: "property classification",
    description: "PPE account groups with default useful life for depreciation.",
    labelField: "name",
    codeField: "code",
    viewPermission: PERMISSIONS.propertyView,
    managePermission: PERMISSIONS.propertyManage,
    fields: [
      { name: "code", label: "Account Code", type: "text", required: true, list: true, unique: true },
      { name: "name", label: "Classification", type: "text", required: true, list: true },
      { name: "usefulLife", label: "Useful Life (years)", type: "number", required: true, list: true },
      { name: "residualRate", label: "Residual Value (%)", type: "number", list: true },
      STATUS,
    ],
  },
  {
    key: "employees",
    title: "Employee Accountability",
    singular: "employee",
    description: "Accountable officers and end users of government property.",
    labelField: "name",
    codeField: "employeeNo",
    viewPermission: PERMISSIONS.propertyView,
    managePermission: PERMISSIONS.propertyManage,
    fields: [
      { name: "employeeNo", label: "Employee No.", type: "text", required: true, list: true, unique: true },
      { name: "name", label: "Full Name", type: "text", required: true, list: true },
      { name: "position", label: "Position", type: "text", required: true, list: true },
      { name: "office", label: "Office / Department", type: "text", required: true, list: true },
      { name: "email", label: "Email", type: "text" },
      STATUS,
    ],
  },
  {
    key: "properties",
    title: "Property Registration",
    singular: "property",
    description: "Register and track property, plant and equipment and semi-expendable items.",
    labelField: "description",
    codeField: "propertyNo",
    viewPermission: PERMISSIONS.propertyView,
    managePermission: PERMISSIONS.propertyManage,
    fields: [
      { name: "propertyNo", label: "Property No.", type: "text", required: true, list: true, unique: true, placeholder: "PPE-2026-0001" },
      { name: "description", label: "Description", type: "text", required: true, list: true },
      { name: "classificationId", label: "Classification", type: "select", optionsFrom: "property-classifications", required: true, list: true },
      { name: "serialNo", label: "Serial No.", type: "text" },
      { name: "acquisitionDate", label: "Date Acquired", type: "date", required: true, list: true },
      { name: "acquisitionCost", label: "Acquisition Cost", type: "currency", required: true, list: true },
      { name: "accountableId", label: "Accountable Officer", type: "select", optionsFrom: "employees", list: true },
      { name: "locationId", label: "Location", type: "select", optionsFrom: "locations" },
      { name: "condition", label: "Condition", type: "select", options: ["Serviceable", "For Repair", "Unserviceable"], required: true, list: true },
      { name: "status", label: "Status", type: "select", options: ["available", "assigned", "for-disposal", "disposed", "lost"], required: true, list: true },
    ],
  },
  {
    key: "label-codes",
    title: "Barcodes and QR Codes",
    singular: "code",
    description: "Barcode and QR code labels generated for inventory items.",
    labelField: "code",
    codeField: "code",
    viewPermission: PERMISSIONS.productsView,
    managePermission: PERMISSIONS.productsManage,
    fields: [
      { name: "code", label: "Code No.", type: "text", required: true, list: true, unique: true },
      { name: "codeType", label: "Code Type", type: "select", options: ["Barcode", "QR Code"], required: true, list: true },
      { name: "productId", label: "Item", type: "select", optionsFrom: "products", required: true, list: true },
      { name: "generatedBy", label: "Generated By", type: "text", list: true },
      { name: "generatedAt", label: "Date Generated", type: "date", list: true },
      { name: "printCount", label: "Times Printed", type: "number" },
      { name: "status", label: "Status", type: "select", options: ["active", "inactive", "deactivated"], required: true, list: true },
    ],
  },
  {
    key: "label-templates",
    title: "Label Templates",
    singular: "label template",
    description: "Label layouts used when printing barcode and QR labels.",
    labelField: "name",
    codeField: "name",
    viewPermission: PERMISSIONS.productsView,
    managePermission: PERMISSIONS.productsManage,
    fields: [
      { name: "name", label: "Template Name", type: "text", required: true, list: true, unique: true },
      { name: "category", label: "Category", type: "select", options: ["Item Label", "Inventory Label", "Asset Label", "Location Label", "Property Tag"], required: true, list: true },
      { name: "labelSize", label: "Label Size", type: "select", options: ["100 mm x 50 mm", "80 mm x 50 mm", "60 mm x 40 mm", "50 mm x 25 mm", "40 mm x 25 mm", "100 mm x 30 mm"], required: true, list: true },
      { name: "orientation", label: "Orientation", type: "select", options: ["Landscape", "Portrait"], required: true },
      { name: "showLogo", label: "Show Organization Logo", type: "checkbox" },
      { name: "showDetails", label: "Show Item Details", type: "checkbox" },
      { name: "showBarcode", label: "Show Barcode", type: "checkbox" },
      { name: "showQr", label: "Show QR Code", type: "checkbox" },
      STATUS,
    ],
  },
  {
    key: "label-prints",
    title: "Label Print History",
    singular: "print job",
    description: "Label generation and printing jobs.",
    labelField: "reference",
    codeField: "reference",
    viewPermission: PERMISSIONS.productsView,
    managePermission: PERMISSIONS.productsManage,
    fields: [
      { name: "reference", label: "Reference", type: "text", required: true, list: true },
      { name: "labelType", label: "Label Type", type: "text", required: true, list: true },
      { name: "template", label: "Template", type: "text", list: true },
      { name: "items", label: "Items", type: "number", list: true },
      { name: "labels", label: "Labels", type: "number", list: true },
      { name: "printedBy", label: "Printed By", type: "text", list: true },
      { name: "printedAt", label: "Date / Time", type: "text", list: true },
    ],
  },
];

export function getMasterData(key: string) {
  return MASTER_DATA.find((item) => item.key === key);
}
