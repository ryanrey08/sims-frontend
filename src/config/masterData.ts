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
      { name: "zone", label: "Zone", type: "text", list: true },
      { name: "rack", label: "Rack", type: "text", list: true },
      { name: "bin", label: "Bin", type: "text", list: true },
      { name: "capacity", label: "Capacity", type: "number", list: true },
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
];

export function getMasterData(key: string) {
  return MASTER_DATA.find((item) => item.key === key);
}
