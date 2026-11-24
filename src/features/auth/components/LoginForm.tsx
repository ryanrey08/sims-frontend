"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { FormField, fieldA11y } from "@/components/forms/FormField";
import { apiConfig } from "@/services/api/apiConfig";
import { useLoginMutation } from "@/services/api/endpoints/authApi";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAuth } from "@/store/features/authSlice";
import { loginSchema, type LoginValues } from "../schemas/authSchemas";

const DEMO_ACCOUNTS = [
  { label: "Administrator", email: "admin@sims.local" },
  { label: "Inventory Manager", email: "manager@sims.local" },
  { label: "Purchasing Officer", email: "purchasing@sims.local" },
  { label: "Warehouse Staff", email: "warehouse@sims.local" },
  { label: "Requester", email: "requester@sims.local" },
];
const DEMO_PASSWORD = "Password@123";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const { sessionExpired } = useAppSelector(selectAuth);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: true } });

  // On success the auth slice updates and AuthLayout redirects.
  const onSubmit = handleSubmit(async ({ email, password }) => {
    await login({ email, password }).unwrap().catch(() => undefined);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink">Welcome back</h2>
      <p className="mt-1 text-sm text-muted">Sign in to your SIMS account to continue.</p>

      <div className="mt-8">
        {sessionExpired && !error && (
          <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Your session has ended. Please sign in again.
          </div>
        )}
        <FormErrorBanner error={error} />
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormField label="Email address" htmlFor="email" required error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="you@company.com" {...fieldA11y("email", errors.email?.message)} {...register("email")} />
          </FormField>
          <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-10"
                {...fieldA11y("password", errors.password?.message)}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
          <div className="flex items-center justify-between">
            <Checkbox id="remember" label="Keep me signed in" {...register("remember")} />
            <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={isLoading}>
            Sign in
          </Button>
        </form>

        {apiConfig.mode === "mock" && (
          <div className="mt-8 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
              <Info className="h-4 w-4" /> Demo accounts (mock API)
            </p>
            <p className="mt-1 text-xs text-muted">
              Each role sees different menus. Password for all: <code className="font-mono">{DEMO_PASSWORD}</code>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setValue("email", account.email, { shouldValidate: true });
                    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                  }}
                  className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-left text-xs hover:border-brand-300"
                >
                  <span className="block font-semibold text-ink">{account.label}</span>
                  <span className="block truncate text-muted">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
