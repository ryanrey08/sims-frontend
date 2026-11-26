import { appConfig } from "@/config/app.config";
import type { SelectOption } from "@/components/ui/Select";

const toOptions = (values: readonly string[]): SelectOption[] => values.map((value) => ({ label: value, value }));

export const UNIT_OPTIONS = toOptions(appConfig.units);
export const DEPARTMENT_OPTIONS = toOptions(appConfig.departments);
export const PAYMENT_TERM_OPTIONS = toOptions(appConfig.paymentTerms);

export const ACTIVE_STATUS_OPTIONS: SelectOption[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];
export const PRODUCT_STATUS_OPTIONS: SelectOption[] = [
  { label: "Active", value: "active" },
  { label: "Discontinued", value: "discontinued" },
];
export const STOCK_STATUS_OPTIONS: SelectOption[] = [
  { label: "Sufficient", value: "in-stock" },
  { label: "Below Reorder", value: "low-stock" },
  { label: "Out of Stock", value: "out-of-stock" },
];
export const WAREHOUSE_TYPE_OPTIONS: SelectOption[] = [
  { label: "Central", value: "central" },
  { label: "Supplies", value: "supplies" },
  { label: "Property", value: "property" },
  { label: "Field", value: "field" },
];

/** Category pill colours used in the mockups. */
export function categoryTone(name: string | undefined) {
  const value = (name ?? "").toLowerCase();
  if (value.includes("ict equipment") || value.includes("building")) return "success" as const;
  if (value.includes("ict") || value.includes("audio")) return "purple" as const;
  if (value.includes("janitorial") || value.includes("furniture")) return "warning" as const;
  if (value.includes("medical") || value.includes("security")) return "danger" as const;
  if (value.includes("motor") || value.includes("pantry")) return "orange" as const;
  return "info" as const;
}
export const MOVEMENT_TYPE_OPTIONS: SelectOption[] = [
  { label: "Receipt", value: "receipt" },
  { label: "Issue", value: "issue" },
  { label: "Adjustment +", value: "adjustment-in" },
  { label: "Adjustment −", value: "adjustment-out" },
  { label: "Transfer in", value: "transfer-in" },
  { label: "Transfer out", value: "transfer-out" },
];
export const PO_STATUS_OPTIONS: SelectOption[] = [
  { label: "Draft", value: "draft" },
  { label: "Pending approval", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Partially received", value: "partially-received" },
  { label: "Received", value: "received" },
  { label: "Cancelled", value: "cancelled" },
];
export const REQUISITION_STATUS_OPTIONS: SelectOption[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Issued", value: "issued" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];
export const PRIORITY_OPTIONS: SelectOption[] = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];
