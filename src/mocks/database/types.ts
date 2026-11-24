import type {
  ActivityLog,
  AppNotification,
  Category,
  Product,
  PurchaseOrder,
  Requisition,
  Role,
  StockLevel,
  StockMovement,
  Supplier,
  SystemSettings,
  User,
  Warehouse,
} from "@/types/models";
import type { MasterRecord, TransactionDocument } from "@/types/records";

/** Shape of the in-browser mock database. Records are stored without derived fields. */
export interface MockDatabase {
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  requisitions: Requisition[];
  /** Master-data registries keyed by MASTER_DATA key (locations, units, employees, properties…). */
  masters: Record<string, MasterRecord[]>;
  /** Transaction documents of every DOCUMENTS type. */
  documents: TransactionDocument[];
  users: User[];
  roles: Role[];
  settings: SystemSettings;
  notifications: AppNotification[];
  activities: ActivityLog[];
  /** Mock-only: demo passwords by email. Never used in real mode. */
  credentials: Record<string, string>;
  /** Mock-only: issued session tokens → user id. */
  sessions: Record<string, string>;
  /** Mock-only: issued password reset tokens → email. */
  resetTokens: Record<string, string>;
}
