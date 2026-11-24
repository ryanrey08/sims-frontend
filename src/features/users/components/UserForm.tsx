"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/common/PageHeader";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, FormSection, RequiredNote, fieldA11y } from "@/components/forms/FormField";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ACTIVE_STATUS_OPTIONS, DEPARTMENT_OPTIONS } from "@/constants/options";
import { useToast } from "@/hooks/useToast";
import { applyServerErrors, nonFieldError } from "@/lib/utils/errors";
import { useGetRolesQuery } from "@/services/api/endpoints/rolesApi";
import { useCreateUserMutation, useUpdateUserMutation } from "@/services/api/endpoints/usersApi";
import type { User } from "@/types/models";
import { createUserSchema, updateUserSchema, type UserFormValues } from "../schemas/userSchema";

export function UserForm({ user }: { user?: User }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(user);
  const { data: roles } = useGetRolesQuery();
  const [createUser, createState] = useCreateUserMutation();
  const [updateUser, updateState] = useUpdateUserMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: user
      ? { name: user.name, email: user.email, roleId: user.roleId, department: user.department, status: user.status, password: "" }
      : { name: "", email: "", roleId: "", department: "", status: "active", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = user
        ? await updateUser({ id: user.id, body: { name: values.name, email: values.email, roleId: values.roleId, department: values.department, status: values.status } }).unwrap()
        : await createUser(values).unwrap();
      toast.success(isEdit ? "User updated" : "User created", saved.name);
      router.push(`/users/${saved.id}`);
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not save user", error);
    }
  });

  const err = (name: keyof UserFormValues) => errors[name]?.message;
  const field = (name: keyof UserFormValues) => ({ ...fieldA11y(name, err(name)), ...register(name) });

  return (
    <>
      <PageHeader title={isEdit ? `Edit ${user?.name}` : "Add user"} description="Grant someone access to SIMS and choose what they can do." />
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <CardContent>
            <FormErrorBanner error={nonFieldError(isEdit ? updateState.error : createState.error)} />
            <RequiredNote />
            <div className="mt-4">
              <FormSection title="Account">
                <FormField label="Full name" htmlFor="name" required error={err("name")}>
                  <Input autoComplete="off" {...field("name")} />
                </FormField>
                <FormField label="Email" htmlFor="email" required error={err("email")}>
                  <Input type="email" autoComplete="off" {...field("email")} />
                </FormField>
                {!isEdit && (
                  <FormField label="Temporary password" htmlFor="password" required error={err("password")} hint="The user can change this after signing in.">
                    <Input type="password" autoComplete="new-password" {...field("password")} />
                  </FormField>
                )}
              </FormSection>
              <FormSection title="Access" description="The role controls which modules and actions are available.">
                <FormField label="Role" htmlFor="roleId" required error={err("roleId")}>
                  <Select placeholder="Select a role" options={(roles?.data ?? []).map((role) => ({ label: role.name, value: role.id }))} {...field("roleId")} />
                </FormField>
                <FormField label="Department" htmlFor="department" required error={err("department")}>
                  <Select placeholder="Select a department" options={DEPARTMENT_OPTIONS} {...field("department")} />
                </FormField>
                <FormField label="Status" htmlFor="status" required error={err("status")}>
                  <Select options={ACTIVE_STATUS_OPTIONS} {...field("status")} />
                </FormField>
              </FormSection>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" loading={isSubmitting} disabled={isEdit && !isDirty}>{isEdit ? "Save changes" : "Create user"}</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
