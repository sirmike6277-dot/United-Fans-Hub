"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrength } from "./PasswordStrength";
import { AuthDivider } from "./AuthDivider";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { FormError } from "./FormError";
import { PersonIcon, UsernameIcon, EmailIcon, LockIcon } from "./FieldIcons";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sent" | "error">("idle");

  const confirmError = useMemo(
    () => (confirmPassword && confirmPassword !== password ? "Passwords do not match." : undefined),
    [confirmPassword, password],
  );
  const usernameError = useMemo(
    () => (username && !USERNAME_PATTERN.test(username) ? "3-24 letters, numbers, or _." : undefined),
    [username],
  );

  const canSubmit = agreed && !confirmError && !usernameError && !loading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
        // Where Supabase sends the browser after the confirmation link is
        // clicked and verified server-side (see /auth/callback). Must be
        // in the project's Redirect URLs allowlist (Supabase dashboard →
        // Authentication → URL Configuration) or Supabase silently falls
        // back to the project's default Site URL instead — see the report
        // for the exact values to add there.
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      const message = signUpError.message.toLowerCase();
      if (message.includes("already registered")) {
        setError("An account with that email already exists.");
      } else if (message.includes("rate limit")) {
        setError(
          "Too many signup attempts right now — please wait a few minutes and try again.",
        );
      } else if ((signUpError.status ?? 0) >= 500) {
        // A 5xx here means Supabase Auth itself failed (most commonly: it
        // couldn't send the confirmation email) — nothing the visitor did
        // wrong, so don't imply their username/email was the problem. The
        // signup is atomically rolled back server-side in this case (no
        // account is left half-created), so "try again" is genuinely correct.
        setError(
          "Something went wrong on our end while creating your account. Please try again in a few minutes.",
        );
      } else {
        setError("We couldn't create your account. That username or email may already be taken.");
      }
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // No session yet — email confirmation is required before sign-in.
    setCheckEmail(true);
  }

  async function handleResend() {
    if (resending) return;
    setResending(true);
    setResendState("idle");

    const supabase = createClient();
    // Same shape as the initial signUp — Supabase's own resend() call for
    // an unconfirmed account, not a second signup attempt (which would
    // just return the "already registered" error instead of a new email).
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
    });

    setResending(false);
    setResendState(resendError ? "error" : "sent");
  }

  if (checkEmail) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-xl font-bold uppercase text-ink">Check your inbox</h2>
        <p className="text-sm text-text-muted">
          We&apos;ve sent a confirmation link to <span className="text-ink">{email}</span>.
          Click it to activate your account, then log in.
        </p>

        <div className="mt-2 flex flex-col items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleResend} loading={resending} disabled={resending}>
            {resending ? "Sending..." : "Resend verification email"}
          </Button>
          {resendState === "sent" ? (
            <p className="text-xs text-text-muted">Sent — check your inbox (and spam folder) again.</p>
          ) : resendState === "error" ? (
            <p className="text-xs text-red-hover">Couldn&apos;t resend right now. Please try again shortly.</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <FormError message={error} /> : null}

      <Input
        label="Full Name"
        name="fullName"
        autoComplete="name"
        placeholder="Enter your full name"
        icon={<PersonIcon />}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={loading}
        required
      />

      <div className="flex flex-col gap-1.5">
        <Input
          label="Username"
          name="username"
          autoComplete="username"
          placeholder="Choose a username"
          icon={<UsernameIcon />}
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
          error={usernameError}
          disabled={loading}
          required
        />
        <p className="text-xs text-text-muted">
          Your public fan identity — how the community will see you.
        </p>
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Enter your email"
        icon={<EmailIcon />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        required
      />

      <PasswordInput
        label="Password"
        name="password"
        autoComplete="new-password"
        placeholder="Create a password"
        icon={<LockIcon />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
        minLength={6}
      />
      <PasswordStrength password={password} />

      <PasswordInput
        label="Confirm Password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Confirm your password"
        icon={<LockIcon />}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={confirmError}
        disabled={loading}
        required
      />

      <label className="flex items-start gap-3 text-sm text-text-muted">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          disabled={loading}
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-red-primary)]"
        />
        <span>
          I agree to the{" "}
          <a href="/terms" className="text-red-primary underline-offset-4 hover:text-red-hover hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-red-primary underline-offset-4 hover:text-red-hover hover:underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>

      <Button type="submit" size="lg" loading={loading} disabled={!canSubmit}>
        {loading ? "Creating your account..." : "Create Account"}
      </Button>

      <AuthDivider />
      <SocialAuthButtons />
    </form>
  );
}
