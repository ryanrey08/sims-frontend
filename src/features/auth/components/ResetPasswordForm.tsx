"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Input } from "@/components/ui/Input";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, fieldA11y } from "@/components/forms/FormField";
import { useResetPasswordMutation } from "@/services/api/endpoints/authApi";
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas/authSchemas";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [resetPassword, { isLoading, isSuccess, data, error }] = useResetPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });

  if (!token) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-ink">Invalid reset link</h2>
        <p className="mt-2 text-sm text-muted">This link is missing its reset token. Request a new one to continue.</p>
        <ButtonLink href="/forgot-password" className="mt-6">
          Request a new link
        </ButtonLink>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div role="status">
        <div className="mb-4 inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-ink">Password updated</h2>
        <p className="mt-2 text-sm text-muted">{data?.message}</p>
        <ButtonLink href="/login" className="mt-6">
          Go to sign in
        </ButtonLink>
      </div>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    await resetPassword({ token, password }).unwrap().catch(() => undefined);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">Set a new password</h2>
      <p className="mt-1 text-sm text-muted">Use at least 8 characters with upper and lowercase letters and a number.</p>
      <div className="mt-8">
        <FormErrorBanner error={error} />
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormField label="New password" htmlFor="password" required error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...fieldA11y("password", errors.password?.message)} {...register("password")} />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldA11y("confirmPassword", errors.confirmPassword?.message)}
              {...register("confirmPassword")}
            />
          </FormField>
          <Button type="submit" size="lg" className="w-full" loading={isLoading}>
            Reset password
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
