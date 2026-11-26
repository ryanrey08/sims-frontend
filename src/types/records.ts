/** Generic record types used by the configurable master-data, document and report engines. */

export type FieldValue = string | number | boolean | null;

/** A master-data record (locations, units, classifications, employees, property…). */
export interface MasterRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  [field: string]: FieldValue | undefined;
}

export type DocumentStatus = "draft" | "pending" | "approved" | "posted" | "rejected" | "cancelled";

export interface ApprovalStep {
  role: string;
  status: "waiting" | "pending" | "approved" | "rejected";
  by?: string | null;
  at?: string | null;
  remarks?: string | null;
}

export interface DocumentItem {
  /** Product (inventory documents) or property record (property documents). */
  refId: string;
  quantity: number;
  unitCost?: number;
  /** Physical count / reconciliation: system quantity and counted quantity. */
  systemQty?: number;
  countedQty?: number;
  condition?: string;
  remarks?: string;
  /** Receiving (GRN): ordered / delivered / rejected quantities. `quantity` is the accepted quantity. */
  poQty?: number;
  receivedQty?: number;
  rejectedQty?: number;
  /** Derived by the API */
  code?: string;
  description?: string;
  unit?: string;
}

/** File metadata attached to a document (the mock API keeps names and sizes only). */
export interface DocumentAttachment {
  name: string;
  size: number;
  type: string;
}

export interface TransactionDocument {
  id: string;
  type: string;
  number: string;
  date: string;
  status: DocumentStatus;
  fields: Record<string, FieldValue>;
  items: DocumentItem[];
  approvals: ApprovalStep[];
  remarks?: string;
  attachments?: DocumentAttachment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** Derived: display labels for reference fields (e.g. warehouse names). */
  labels?: Record<string, string>;
  totalQuantity?: number;
  totalAmount?: number;
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: "currency" | "number" | "date" | "datetime" | "status" | "text";
}

/** Server-generated table used by government forms, monitoring views and report generation. */
export interface ReportTable {
  code: string;
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  columns: ReportColumn[];
  rows: Record<string, FieldValue>[];
  totals?: Record<string, FieldValue>;
  signatories?: { label: string; name: string; position: string }[];
}
