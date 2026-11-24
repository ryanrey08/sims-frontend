import { z } from "zod";

/** Reusable Zod building blocks shared by feature schemas. */
export const requiredString = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

export const optionalString = (max = 255) => z.string().trim().max(max).optional().or(z.literal(""));

export const emailField = z.string().trim().min(1, "Email is required.").email("Enter a valid email address.");

export const optionalEmail = z.string().trim().email("Enter a valid email address.").optional().or(z.literal(""));

export const phoneField = (label = "Phone number") =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .regex(/^(\+?63|0)9\d{9}$|^\(?\d{2,3}\)?[\s-]?\d{3,4}[\s-]?\d{4}$/, `Enter a valid ${label.toLowerCase()} (e.g. 09171234567).`);

export const optionalPhone = z
  .string()
  .trim()
  .regex(/^(\+?63|0)9\d{9}$/, "Enter a valid mobile number (e.g. 09171234567).")
  .optional()
  .or(z.literal(""));

export const dateField = (label: string) =>
  z.string().min(1, `${label} is required.`).refine((value) => !Number.isNaN(Date.parse(value)), `Enter a valid date.`);

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/\d/, "Include at least one number.");
