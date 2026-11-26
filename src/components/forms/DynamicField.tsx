"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import type { FieldDef } from "@/config/masterData";
import { STATUS_META } from "@/constants/status";
import { useReferenceOptions } from "@/hooks/useReferenceOptions";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField, fieldA11y } from "./FormField";
import { HField } from "./HField";

/** Builds a Zod schema for config-driven fields. Values are edited as strings and converted on submit. */
export function schemaForFields(fields: FieldDef[]) {
  return z.object(
    Object.fromEntries(
      fields.map((field) => {
        let schema = z.string().trim();
        if (field.type === "number" || field.type === "currency") {
          schema = schema.refine((value) => value === "" || !Number.isNaN(Number(value)), `${field.label} must be a number.`) as unknown as z.ZodString;
          schema = schema.refine((value) => value === "" || Number(value) >= 0, `${field.label} cannot be negative.`) as unknown as z.ZodString;
        }
        if (field.required) schema = schema.refine((value) => value !== "", `${field.label} is required.`) as unknown as z.ZodString;
        return [field.name, schema];
      }),
    ),
  );
}

/** Converts string form values to API values (numbers for numeric fields, null for empty). */
export function toApiValues(fields: FieldDef[], values: Record<string, string>) {
  return Object.fromEntries(
    fields.map((field) => {
      const raw = values[field.name] ?? "";
      if (raw === "") return [field.name, null];
      return [field.name, field.type === "number" || field.type === "currency" ? Number(raw) : raw];
    }),
  );
}

export function optionLabel(value: string) {
  return STATUS_META[value]?.label ?? value;
}

/** Renders one config-driven field with label, validation message and the right control. */
export function DynamicField({
  field,
  registration,
  error,
  className,
  layout = "stacked",
  readOnly,
}: {
  field: FieldDef;
  registration: UseFormRegisterReturn;
  error?: string;
  className?: string;
  /** "horizontal" puts the label on the left, as in the mockup transaction forms. */
  layout?: "stacked" | "horizontal";
  readOnly?: boolean;
}) {
  const { options: referenceOptions, loading } = useReferenceOptions(field.optionsFrom);
  const a11y = fieldA11y(field.name, error);
  let control: React.ReactNode;
  if (field.type === "select") {
    const options = field.optionsFrom ? referenceOptions : (field.options ?? []).map((value) => ({ label: optionLabel(value), value }));
    // Remount once async options arrive so React Hook Form re-applies the stored value.
    control = <Select key={options.length} placeholder={loading ? "Loading…" : `Select ${field.label.toLowerCase()}`} options={options} disabled={readOnly} {...a11y} {...registration} />;
  } else if (field.type === "textarea") {
    control = <Textarea rows={2} placeholder={field.placeholder} {...a11y} {...registration} />;
  } else {
    control = (
      <Input
        type={field.type === "date" ? "date" : field.type === "number" || field.type === "currency" ? "number" : "text"}
        step={field.type === "currency" ? "0.01" : undefined}
        placeholder={field.placeholder}
        {...a11y}
        {...registration}
      />
    );
  }
  const label = field.type === "currency" ? `${field.label} (₱)` : field.label;
  if (layout === "horizontal") {
    return (
      <HField label={label} htmlFor={field.name} required={field.required} error={error} hint={field.hint} className={className}>
        {control}
      </HField>
    );
  }
  return (
    <FormField label={field.type === "currency" ? `${field.label} (₱)` : field.label} htmlFor={field.name} required={field.required} error={error} hint={field.hint} className={className}>
      {control}
    </FormField>
  );
}
