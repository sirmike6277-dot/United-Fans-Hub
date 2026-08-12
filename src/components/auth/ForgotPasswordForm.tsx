"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmailIcon } from "./FieldIcons";

/**
 * The success state here is intentionally shown regardless of whether the
 * email actually matches an account — that's real security practice (don't
 * let this endpoint reveal which emails are registered), not a fake result.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-xl font-bold uppercase text-white">Check your inbox</h2>
        <p className="text-sm text-text-muted">
          If an account exists for this email address, we&apos;ve sent instructions to reset your
          password.
        </p>
        <Link
          href="/login"
          className="mt-3 text-sm font-medium text-red-primary underline-offset-4 hover:text-red-hover hover:underline"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Enter your email address"
        icon={<EmailIcon />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        required
      />

      <Button type="submit" size="lg" loading={loading} disabled={loading}>
        {loading ? "Sending link..." : "Send Reset Link"}
      </Button>

      <Link
        href="/login"
        className="self-center text-sm font-medium text-red-primary hover:text-red-hover"
      >
        Back to Login
      </Link>
    </form>
  );
}
