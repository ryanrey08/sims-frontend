"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ALL_PERMISSIONS, type Permission } from "@/constants/permissions";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { optionalString, requiredString } from "@/schemas/common";
import { useCreateRoleMutation, useGetPermissionsQuery, useUpdateRoleMutation } from "@/services/api/endpoints/rolesApi";
import type { Role } from "@/types/models";

const roleSchema = z.object({
  name: requiredString("Role name", 40),
  description: optionalString(200),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [Permission, ...Permission[]])).min(1, "Select at least one permission."),
});
type RoleValues = z.infer<typeof roleSchema>;

export function RoleForm({ role }: { role?: Role }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(role);
  const { data: definitions, isLoading } = useGetPermissionsQuery();
  const [createRole, createState] = useCreateRoleMutation();
  const [updateRole, updateState] = useUpdateRoleMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: role ? { name: role.name, description: role.description, permissions: role.permissions } : { name: "", description: "", permissions: [] },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof definitions>>();
    (definitions ?? []).forEach((definition) => map.set(definition.module, [...(map.get(definition.module) ?? []), definition]));
    return [...map.entries()];
  }, [definitions]);

  const onSubmit = handleSubmit(async (values) => {
    const body = { ...values, description: values.description ?? "" };
    try {
      const saved = role ? await updateRole({ id: role.id, body }).unwrap() : await createRole(body).unwrap();
      toast.success(isEdit ? "Role updated" : "Role created", `${saved.name} now has ${saved.permissions.length} permissions.`);
      router.push("/roles");
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not save role", error);
    }
  });

  return (
    <>
      <PageHeader title={isEdit ? `Edit ${role?.name}` : "Add role"} description="Choose exactly which modules and actions this role can use." />
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
              <RequiredNote />
            </div>
            <FormField label="Role name" htmlFor="name" required error={errors.name?.message} hint={role?.isSystem ? "System role names cannot be changed." : undefined}>
              <Input disabled={role?.isSystem} {...fieldA11y("name", errors.name?.message)} {...register("name")} />
            </FormField>
            <FormField label="Description" htmlFor="description" error={errors.description?.message}>
              <Textarea rows={1} {...fieldA11y("description", errors.description?.message)} {...register("description")} />
            </FormField>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Permissions" description={errors.permissions?.message ?? "Grouped by module."} />
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <Controller
                control={control}
                name="permissions"
                render={({ field }) => (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {grouped.map(([module, items]) => {
                      const keys = items.map((item) => item.key);
                      const allOn = keys.every((key) => field.value.includes(key));
                      return (
                        <fieldset key={module} className="rounded-lg border border-line p-4">
                          <legend className="flex w-full items-center justify-between px-1 text-sm font-semibold">
                            {module}
                            <button
                              type="button"
                              className="ml-3 text-xs font-medium text-brand-700 hover:underline"
                              onClick={() => field.onChange(allOn ? field.value.filter((key) => !keys.includes(key)) : [...new Set([...field.value, ...keys])])}
                            >
                              {allOn ? "Clear" : "Select all"}
                            </button>
                          </legend>
                          <div className="mt-2 space-y-2.5">
                            {items.map((item) => (
                              <Checkbox
                                key={item.key}
                                id={`perm-${item.key}`}
                                label={item.label}
                                description={<code className="text-[11px]">{item.key}</code>}
                                checked={field.value.includes(item.key)}
                                onChange={(event) =>
                                  field.onChange(event.target.checked ? [...field.value, item.key] : field.value.filter((key) => key !== item.key))
                                }
                              />
                            ))}
                          </div>
                        </fieldset>
                      );
                    })}
                  </div>
                )}
              />
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={isEdit && !isDirty}>{isEdit ? "Save role" : "Create role"}</Button>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
