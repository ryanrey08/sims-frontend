import { z } from "zod";
import { dateField, optionalString } from "@/schemas/common";

export const lineItemSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  quantity: z.number({ invalid_type_error: "Qty?" }).int("Whole numbers only.").min(1, "At least 1."),
  unitCost: z.number({ invalid_type_error: "Cost?" }).min(0, "Cannot be negative."),
});

export const purchaseOrderSchema = z
  .object({
    supplierId: z.string().min(1, "Select a supplier."),
    warehouseId: z.string().min(1, "Select the receiving warehouse."),
    orderDate: dateField("Order date"),
    expectedDate: dateField("Expected delivery date"),
    notes: optionalString(500),
    items: z
      .array(lineItemSchema)
      .min(1, "Add at least one item.")
      .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, "Each product can appear only once."),
  })
  .refine((values) => values.expectedDate >= values.orderDate, {
    path: ["expectedDate"],
    message: "Expected date must be on or after the order date.",
  });

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
