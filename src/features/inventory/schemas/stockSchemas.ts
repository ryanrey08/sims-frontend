import { z } from "zod";
import { requiredString } from "@/schemas/common";

const quantity = z
  .number({ invalid_type_error: "Enter a quantity." })
  .int("Use a whole number.")
  .min(1, "Quantity must be at least 1.")
  .max(100000, "That quantity looks too large.");

export const adjustmentSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  warehouseId: z.string().min(1, "Select a warehouse."),
  direction: z.enum(["in", "out"]),
  quantity,
  reason: requiredString("Reason", 200),
});
export type AdjustmentValues = z.infer<typeof adjustmentSchema>;

export const transferSchema = z
  .object({
    productId: z.string().min(1, "Select a product."),
    fromWarehouseId: z.string().min(1, "Select the source warehouse."),
    toWarehouseId: z.string().min(1, "Select the destination warehouse."),
    quantity,
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((values) => values.fromWarehouseId !== values.toWarehouseId, {
    path: ["toWarehouseId"],
    message: "Destination must differ from the source.",
  });
export type TransferValues = z.infer<typeof transferSchema>;
