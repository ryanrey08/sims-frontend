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
  itemType: z.string().min(1, "Select an item type."),
  shortDescription: optionalString(80),
  subcategory: optionalString(80),
  itemGroup: optionalString(80),
  brand: optionalString(80),
  model: optionalString(80),
  accountCode: optionalString(20),
  minStock: count("Minimum stock"),
  maxStock: count("Maximum stock"),
  defaultWarehouseId: z.string().min(1, "Select the default warehouse."),
  unitPrice: money("Unit price"),
  valuationMethod: z.string().min(1, "Select a valuation method."),
  specifications: optionalString(1000),
  remarks: optionalString(500),
  imageUrl: z.string().optional(),
}).refine((values) => values.maxStock === 0 || values.maxStock >= values.minStock, { path: ["maxStock"], message: "Maximum stock must be at least the minimum stock." });

export type ProductFormValues = z.infer<typeof productSchema>;
