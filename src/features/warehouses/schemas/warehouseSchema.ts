import { z } from "zod";
import { optionalString, requiredString } from "@/schemas/common";

export const warehouseSchema = z.object({
  code: z.string().trim().regex(/^[A-Z]{2}-[A-Z0-9]{2,6}$/, "Use the format XX-CODE (e.g. WH-EAST)."),
  name: requiredString("Warehouse name", 80),
  type: z.enum(["main", "branch", "storeroom"]),
  address: requiredString("Address", 200),
  manager: requiredString("Manager", 80),
  phone: optionalString(30),
  status: z.enum(["active", "inactive"]),
});

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;
