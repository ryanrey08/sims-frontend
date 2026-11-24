import { z } from "zod";
import { optionalString, requiredString } from "@/schemas/common";

const money = (label: string) =>
  z.number({ invalid_type_error: `Enter the ${label.toLowerCase()}.` }).min(0, `${label} cannot be negative.`).max(10_000_000);
const count = (label: string) =>
  z.number({ invalid_type_error: `Enter the ${label.toLowerCase()}.` }).int("Use a whole number.").min(0, `${label} cannot be negative.`);

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3, "SKU is required.")
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers and dashes only (e.g. OFF-0001)."),
  name: requiredString("Product name", 120),
  description: optionalString(500),
  categoryId: z.string().min(1, "Select a category."),
  unit: z.string().min(1, "Select a unit of measure."),
  unitCost: money("Unit cost"),
  reorderLevel: count("Reorder level"),
  reorderQuantity: count("Reorder quantity").min(1, "Reorder quantity must be at least 1."),
  preferredSupplierId: z.string().optional(),
  barcode: z.string().trim().regex(/^\d{8,14}$/, "Barcodes are 8–14 digits.").optional().or(z.literal("")),
  status: z.enum(["active", "discontinued"]),
});

export type ProductFormValues = z.infer<typeof productSchema>;
