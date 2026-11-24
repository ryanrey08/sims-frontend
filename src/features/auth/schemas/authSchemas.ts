import { z } from "zod";
import { emailField, passwordField } from "@/schemas/common";

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required."),
  remember: z.boolean().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: passwordField, confirmPassword: z.string().min(1, "Confirm your new password.") })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: emailField,
});
export type ProfileValues = z.infer<typeof profileSchema>;
