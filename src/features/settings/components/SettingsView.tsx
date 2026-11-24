"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DatabaseZap, Server } from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { FormField, FormSection, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors } from "@/lib/utils/errors";
import { formatDateTime } from "@/lib/utils/format";
import { emailField, optionalString, requiredString } from "@/schemas/common";
import { apiConfig } from "@/services/api/apiConfig";
import { useGetSettingsQuery, useResetDemoDataMutation, useUpdateSettingsMutation } from "@/services/api/endpoints/settingsApi";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import type { SystemSettings } from "@/types/models";

const settingsSchema = z.object({
  organizationName: requiredString("Organization name", 120),
  address: optionalString(200),
  email: emailField,
  phone: optionalString(30),
  currency: z.string().min(3).max(3),
  poPrefix: z.string().trim().min(2, "Prefix is required.").max(12),
  requisitionPrefix: z.string().trim().min(2, "Prefix is required.").max(12),
  defaultWarehouseId: z.string().min(1, "Select a default warehouse."),
  lowStockAlerts: z.boolean(),
  requirePoApproval: z.boolean(),
});
type SettingsValues = z.infer<typeof settingsSchema>;

function SettingsForm({ settings }: { settings: SystemSettings }) {
  const toast = useToast();
  const [updateSettings] = useUpdateSettingsMutation();
  const { data: warehouses } = useGetWarehousesQuery();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema), defaultValues: { ...settings } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await updateSettings({ ...values, address: values.address ?? "", phone: values.phone ?? "" }).unwrap();
      reset({ ...saved });
      toast.success("Settings saved");
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not save settings", error);
    }
  });
  const err = (name: keyof SettingsValues) => errors[name]?.message;
  const field = (name: keyof SettingsValues) => ({ ...fieldA11y(name, err(name)), ...register(name) });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader title="Organization & inventory settings" description={`Last updated ${formatDateTime(settings.updatedAt)}`} />
        <CardContent>
          <RequiredNote />
          <div className="mt-4">
            <FormSection title="Organization" description="Shown on printed purchase orders and requisitions.">
              <FormField label="Organization name" htmlFor="organizationName" required error={err("organizationName")} className="sm:col-span-2">
                <Input {...field("organizationName")} />
              </FormField>
              <FormField label="Address" htmlFor="address" error={err("address")} className="sm:col-span-2">
                <Textarea rows={2} {...field("address")} />
              </FormField>
              <FormField label="Email" htmlFor="email" required error={err("email")}>
                <Input type="email" {...field("email")} />
              </FormField>
              <FormField label="Phone" htmlFor="phone" error={err("phone")}>
                <Input {...field("phone")} />
              </FormField>
            </FormSection>
            <FormSection title="Documents & defaults" description="Numbering and default locations.">
              <FormField label="PO number prefix" htmlFor="poPrefix" required error={err("poPrefix")}>
                <Input {...field("poPrefix")} />
              </FormField>
              <FormField label="Requisition prefix" htmlFor="requisitionPrefix" required error={err("requisitionPrefix")}>
                <Input {...field("requisitionPrefix")} />
              </FormField>
              <FormField label="Default warehouse" htmlFor="defaultWarehouseId" required error={err("defaultWarehouseId")}>
                <Select options={(warehouses?.data ?? []).map((item) => ({ label: item.name, value: item.id }))} {...field("defaultWarehouseId")} />
              </FormField>
              <FormField label="Currency" htmlFor="currency" required error={err("currency")}>
                <Select options={[{ label: "PHP – Philippine peso", value: "PHP" }]} {...field("currency")} />
              </FormField>
            </FormSection>
            <FormSection title="Controls">
              <div className="space-y-3 sm:col-span-2">
                <Checkbox id="lowStockAlerts" label="Low-stock alerts" description="Notify managers when a product reaches its reorder level." {...register("lowStockAlerts")} />
                <Checkbox id="requirePoApproval" label="Require purchase order approval" description="Submitted POs must be approved before they can be received." {...register("requirePoApproval")} />
              </div>
            </FormSection>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => reset()} disabled={!isDirty || isSubmitting}>Discard</Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save settings</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function SettingsView() {
  const toast = useToast();
  const query = useGetSettingsQuery();
  const [resetDemo, { isLoading: resetting }] = useResetDemoDataMutation();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <PageHeader title="Settings" description="System-wide configuration for SIMS." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QueryBoundary {...query}>{(settings) => <SettingsForm key={settings.updatedAt} settings={settings} />}</QueryBoundary>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="API connection" />
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2"><Server className="h-4 w-4 text-muted" /> Mode: <Badge tone={apiConfig.mode === "mock" ? "warning" : "success"}>{apiConfig.mode === "mock" ? "Mock API" : "Live API"}</Badge></p>
              <p className="break-all text-muted">Base URL: <code className="text-ink">{apiConfig.baseUrl}</code></p>
              <p className="text-xs text-muted">Set <code>NEXT_PUBLIC_API_MODE</code> and <code>NEXT_PUBLIC_API_BASE_URL</code> in <code>.env.local</code>. See docs/API_INTEGRATION.md.</p>
            </CardContent>
          </Card>
          {apiConfig.mode === "mock" && (
            <Card>
              <CardHeader title="Demo data" />
              <CardContent className="text-sm text-muted">
                Mock data is saved in this browser so your changes survive a reload. Reset it to start over with the original sample data.
              </CardContent>
              <CardFooter>
                <Button variant="danger" onClick={() => setConfirmReset(true)} leftIcon={<DatabaseZap className="h-4 w-4" />}>Reset demo data</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        description="Every change made in mock mode on this browser will be discarded."
        confirmLabel="Reset data"
        loading={resetting}
        onConfirm={async () => {
          try {
            await resetDemo().unwrap();
            toast.success("Demo data restored");
          } catch (error) {
            toast.error("Could not reset data", error);
          }
          setConfirmReset(false);
        }}
        onClose={() => setConfirmReset(false)}
      />
    </>
  );
}
