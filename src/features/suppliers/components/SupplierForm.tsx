"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, FormSection, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ACTIVE_STATUS_OPTIONS, PAYMENT_TERM_OPTIONS } from "@/constants/options";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { useCreateSupplierMutation, useUpdateSupplierMutation } from "@/services/api/endpoints/suppliersApi";
import type { Supplier } from "@/types/models";
import { supplierSchema, type SupplierFormValues } from "../schemas/supplierSchema";

const EMPTY: SupplierFormValues = {
  code: "",
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  tin: "",
  paymentTerms: "Net 30",
  leadTimeDays: 5,
  status: "active",
};

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(supplier);
  const [createSupplier, createState] = useCreateSupplierMutation();
  const [updateSupplier, updateState] = useUpdateSupplierMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier ? { ...EMPTY, ...supplier, tin: supplier.tin ?? "" } : EMPTY,
  });

  const onSubmit = handleSubmit(async (values) => {
    const body = { ...values, address: values.address ?? "", tin: values.tin || undefined };
    try {
      const saved = supplier ? await updateSupplier({ id: supplier.id, body }).unwrap() : await createSupplier(body).unwrap();
      toast.success(isEdit ? "Supplier updated" : "Supplier added", saved.name);
      router.push(`/suppliers/${saved.id}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not save supplier", error);
    }
  });

  const err = (name: keyof SupplierFormValues) => errors[name]?.message;
  const field = (name: keyof SupplierFormValues) => ({ ...fieldA11y(name, err(name)), ...register(name) });

  return (
    <>
      <PageHeader title={isEdit ? `Edit ${supplier?.name}` : "Add supplier"} description="Vendor contact, tax and payment details." />
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardContent>
            <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
            <RequiredNote />
            <div className="mt-4">
              <FormSection title="Company" description="Legal and identification details.">
                <FormField label="Supplier code" htmlFor="code" required error={err("code")} hint="Format: SUP-NNN">
                  <Input className="uppercase" {...fieldA11y("code", err("code"))} {...register("code", { setValueAs: (value: string) => value.toUpperCase() })} />
                </FormField>
                <FormField label="TIN" htmlFor="tin" error={err("tin")}>
                  <Input placeholder="000-000-000-000" {...field("tin")} />
                </FormField>
                <FormField label="Supplier name" htmlFor="name" required error={err("name")} className="sm:col-span-2">
                  <Input {...field("name")} />
                </FormField>
                <FormField label="Address" htmlFor="address" error={err("address")} className="sm:col-span-2">
                  <Textarea rows={2} {...field("address")} />
                </FormField>
              </FormSection>
              <FormSection title="Contact" description="Who receives purchase orders.">
                <FormField label="Contact person" htmlFor="contactPerson" required error={err("contactPerson")}>
                  <Input {...field("contactPerson")} />
                </FormField>
                <FormField label="Email" htmlFor="email" required error={err("email")}>
                  <Input type="email" {...field("email")} />
                </FormField>
                <FormField label="Phone" htmlFor="phone" required error={err("phone")}>
                  <Input type="tel" placeholder="09171234567" {...field("phone")} />
                </FormField>
              </FormSection>
              <FormSection title="Terms" description="Defaults applied to purchase orders.">
                <FormField label="Payment terms" htmlFor="paymentTerms" required error={err("paymentTerms")}>
                  <Select options={PAYMENT_TERM_OPTIONS} {...field("paymentTerms")} />
                </FormField>
                <FormField label="Lead time (days)" htmlFor="leadTimeDays" required error={err("leadTimeDays")}>
                  <Input type="number" min={0} {...fieldA11y("leadTimeDays", err("leadTimeDays"))} {...register("leadTimeDays", { valueAsNumber: true })} />
                </FormField>
                <FormField label="Status" htmlFor="status" required error={err("status")}>
                  <Select options={ACTIVE_STATUS_OPTIONS} {...field("status")} />
                </FormField>
              </FormSection>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={isEdit && !isDirty}>{isEdit ? "Save changes" : "Add supplier"}</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
