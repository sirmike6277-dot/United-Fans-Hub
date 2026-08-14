"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrength } from "./PasswordStrength";
import { FormError } from "./FormError";
import { LockIcon } from "./FieldIcons";

/**
 * Landing page for the link sent by ForgotPasswordForm. Supabase's password
 * recovery flow redirects here with a `code` param that must be exchanged
 * for a session before `updateUser({ password })` is allowed to succeed.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [exchanging, setExchanging] = useState(Boolean(code));
  const [exchangeFailed, setExchangeFailed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // No `code` at all is derivable straight from the URL — only the actual
  // async exchange belongs in an effect.
  const linkError = !code || exchangeFailed;

  useEffect(() => {
    if (!code) return;
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      setExchanging(false);
      if (exchangeError) setExchangeFailed(true);
    });
  }, [code]);

  const confirmError = useMemo(
    () => (confirmPassword && confirmPassword !== password ? "Passwords do not match." : undefined),
    [confirmPassword, password],
  );
  const canSubmit = password.length >= 6 && !confirmError && !loading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError("We couldn't update your password. Please request a new reset link and try again.");
      return;
    }

    setSuccess(true);
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  if (exchanging) {
    return <p className="text-center text-sm text-text-muted">Verifying your link...</p>;
  }

  if (linkError) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-xl font-bold uppercase text-ink">Link expired</h2>
        <p className="text-sm text-text-muted">
          This password reset link is invalid or has expired. Request a new one from the forgot
          password page.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-xl font-bold uppercase text-ink">Password updated</h2>
        <p className="text-sm text-text-muted">Taking you to your dashboard...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <FormError message={error} /> : null}

      <PasswordInput
        label="New Password"
        name="password"
        autoComplete="new-password"
        placeholder="Create a new password"
        icon={<LockIcon />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
        minLength={6}
      />
      <PasswordStrength password={password} />

      <PasswordInput
        label="Confirm New Password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Confirm your new password"
        icon={<LockIcon />}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={confirmError}
        disabled={loading}
        required
      />

      <Button type="submit" size="lg" loading={loading} disabled={!canSubmit}>
        {loading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
