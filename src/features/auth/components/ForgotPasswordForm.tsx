"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, fieldA11y } from "@/components/forms/FormField";
import { apiConfig } from "@/services/api/apiConfig";
import { useForgotPasswordMutation } from "@/services/api/endpoints/authApi";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas/authSchemas";

export function ForgotPasswordForm() {
  const [requestReset, { isLoading, isSuccess, data, error }] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    await requestReset(values).unwrap().catch(() => undefined);
  });

  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      {isSuccess ? (
        <div role="status">
          <div className="mb-4 inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600">
            <MailCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Check your email</h2>
          <p className="mt-2 text-sm text-muted">{data?.message}</p>
          <p className="mt-1 text-sm text-muted">Sent to {getValues("email")}.</p>
          {apiConfig.mode === "mock" && (
            <Link href="/reset-password?token=demo-reset-token" className="mt-6 inline-block text-sm font-medium text-brand-700 hover:underline">
              Mock mode: open the reset link →
            </Link>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-ink">Forgot your password?</h2>
          <p className="mt-1 text-sm text-muted">Enter your account email and we&apos;ll send you a reset link.</p>
          <div className="mt-8">
            <FormErrorBanner error={error} />
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <FormField label="Email address" htmlFor="email" required error={errors.email?.message}>
                <Input type="email" autoComplete="email" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
              </FormField>
              <Button type="submit" size="lg" className="w-full" loading={isLoading}>
                Send reset link
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
