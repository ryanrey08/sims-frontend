import { z } from "zod";
import { dateField, optionalString, requiredString } from "@/schemas/common";

export const requisitionSchema = z.object({
  department: z.string().min(1, "Select a department."),
  warehouseId: z.string().min(1, "Select where to draw supplies from."),
  neededBy: dateField("Needed-by date"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  purpose: requiredString("Purpose", 200),
  remarks: optionalString(300),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Select a product."),
        quantity: z.number({ invalid_type_error: "Qty?" }).int("Whole numbers only.").min(1, "At least 1."),
      }),
    )
    .min(1, "Add at least one item.")
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "Each product can appear only once."),
});

export type RequisitionFormValues = z.infer<typeof requisitionSchema>;
