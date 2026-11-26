import { z } from "zod";
import { optionalString, requiredString } from "@/schemas/common";

export const warehouseSchema = z.object({
  code: z.string().trim().regex(/^[A-Z]{2,4}-[A-Z0-9]{2,8}$/, "Use the format WH-CODE (e.g. WH-NEW)."),
  name: requiredString("Warehouse name", 80),
  type: z.enum(["central", "supplies", "property", "field"]),
  active: z.boolean(),
  address: requiredString("Address", 200),
  region: requiredString("Region", 80),
  city: requiredString("City / Municipality", 80),
  barangay: optionalString(80),
  postalCode: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit postal code.").optional().or(z.literal("")),
  manager: optionalString(80),
  phone: optionalString(30),
  allowTransactions: z.boolean(),
  allowTransfer: z.boolean(),
  allowPhysicalInventory: z.boolean(),
  defaultReceiving: z.boolean(),
  defaultIssuance: z.boolean(),
  remarks: optionalString(500),
});

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;
