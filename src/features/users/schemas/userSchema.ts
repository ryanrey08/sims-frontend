import { z } from "zod";
import { emailField, passwordField, requiredString } from "@/schemas/common";

const base = {
  name: requiredString("Full name", 80),
  email: emailField,
  roleId: z.string().min(1, "Select a role."),
  department: z.string().min(1, "Select a department."),
  status: z.enum(["active", "inactive"]),
};

export const createUserSchema = z.object({ ...base, password: passwordField });
export const updateUserSchema = z.object({ ...base, password: z.string().optional() });
export type UserFormValues = z.infer<typeof createUserSchema>;
