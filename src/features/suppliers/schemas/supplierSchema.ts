import { z } from "zod";
import { emailField, optionalString, phoneField, requiredString } from "@/schemas/common";

export const supplierSchema = z.object({
  code: z.string().trim().regex(/^SUP-\d{3,}$/, "Use the format SUP-NNN (e.g. SUP-010)."),
  name: requiredString("Supplier name", 120),
  contactPerson: requiredString("Contact person", 80),
  email: emailField,
  phone: phoneField("Phone number"),
  address: optionalString(200),
  tin: z.string().trim().regex(/^\d{3}-\d{3}-\d{3}-\d{3}$/, "Format: 000-000-000-000").optional().or(z.literal("")),
  paymentTerms: z.string().min(1, "Select payment terms."),
  leadTimeDays: z.number({ invalid_type_error: "Enter the lead time." }).int().min(0).max(180, "Use 180 days or fewer."),
  status: z.enum(["active", "inactive"]),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
