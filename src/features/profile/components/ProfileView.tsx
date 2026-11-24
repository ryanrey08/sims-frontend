"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/common/PageHeader";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { FormField, fieldA11y } from "@/components/forms/FormField";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PERMISSION_LABELS } from "@/constants/permissions";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/lib/redux/hooks";
import { applyServerErrors } from "@/lib/utils/errors";
import { useChangePasswordMutation, useUpdateProfileMutation } from "@/services/api/endpoints/authApi";
import { selectCurrentUser } from "@/store/features/authSlice";
import { changePasswordSchema, profileSchema, type ChangePasswordValues, type ProfileValues } from "@/features/auth/schemas/authSchemas";

function ProfileForm({ name, email }: { name: string; email: string }) {
  const toast = useToast();
  const [updateProfile] = useUpdateProfileMutation();
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, email },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await updateProfile(values).unwrap();
      reset({ name: saved.name, email: saved.email });
      toast.success("Profile updated");
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not update profile", error);
    }
  });
  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader title="Personal details" />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="name" required error={errors.name?.message}>
            <Input autoComplete="name" {...fieldA11y("name", errors.name?.message)} {...register("name")} />
          </FormField>
          <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
          </FormField>
        </CardContent>
        <CardFooter>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save profile</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [changePassword] = useChangePasswordMutation();
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      reset();
      toast.success("Password changed");
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error("Could not change password", error);
    }
  });
  const err = (name: keyof ChangePasswordValues) => errors[name]?.message;
  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader title="Change password" description="At least 8 characters with upper and lowercase letters and a number." />
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField label="Current password" htmlFor="currentPassword" required error={err("currentPassword")}>
            <Input type="password" autoComplete="current-password" {...fieldA11y("currentPassword", err("currentPassword"))} {...register("currentPassword")} />
          </FormField>
          <FormField label="New password" htmlFor="newPassword" required error={err("newPassword")}>
            <Input type="password" autoComplete="new-password" {...fieldA11y("newPassword", err("newPassword"))} {...register("newPassword")} />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirmPassword" required error={err("confirmPassword")}>
            <Input type="password" autoComplete="new-password" {...fieldA11y("confirmPassword", err("confirmPassword"))} {...register("confirmPassword")} />
          </FormField>
        </CardContent>
        <CardFooter>
          <Button type="submit" loading={isSubmitting}>Update password</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function ProfileView() {
  const user = useAppSelector(selectCurrentUser);
  if (!user) return null;
  return (
    <>
      <PageHeader title="My profile" description="Your account details and access." />
      <ProfileHeader name={user.name} subtitle={user.email} badges={<Badge tone="brand">{user.roleName}</Badge>} meta={[{ label: "Department", value: user.department }, { label: "Permissions", value: user.permissions.length }]} />
      <div className="space-y-6">
        <ProfileForm key={`${user.name}-${user.email}`} name={user.name} email={user.email} />
        <PasswordForm />
        <Card>
          <CardHeader title="What you can do" description={`Granted by the ${user.roleName} role.`} />
          <CardContent className="flex flex-wrap gap-2">
            {user.permissions.map((permission) => <Badge key={permission} tone="brand">{PERMISSION_LABELS[permission]}</Badge>)}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
