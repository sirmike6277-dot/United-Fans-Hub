"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "./PasswordInput";
import { AuthDivider } from "./AuthDivider";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { FormError } from "./FormError";
import { PersonIcon, LockIcon } from "./FieldIcons";

const GENERIC_ERROR = "We couldn't sign you in. Please check your details and try again.";

// Only the identifier (email/username) is ever saved here, never the
// password — browsers' own password managers already handle that
// securely via the `autoComplete="current-password"` below. This is
// purely a convenience prefill, not session persistence: Supabase's own
// docs explicitly advise against trying to shorten/lengthen session
// cookie lifetime for a "remember me" toggle (Max-Age only controls
// whether the browser *sends* the cookie, not whether the session is
// actually still valid server-side — see "Should I set a shorter Max-Age
// parameter on the cookies?" in their troubleshooting guide), so this
// deliberately doesn't touch session/cookie behaviour at all.
const REMEMBERED_IDENTIFIER_KEY = "ufh_remembered_identifier";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Runs once after mount (not during SSR, where localStorage doesn't
  // exist, and not synchronously during hydration either, which would
  // mismatch the server-rendered empty value) — prefills from a previous
  // "remember my login details" visit. Deferred via .then() rather than
  // calling setState directly in the effect body, matching this
  // codebase's established pattern elsewhere (see AwardsHub.tsx) for the
  // same lint rule.
  useEffect(() => {
    Promise.resolve(window.localStorage.getItem(REMEMBERED_IDENTIFIER_KEY)).then((saved) => {
      if (saved) setIdentifier(saved);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    let email = identifier.trim();

    // Auth signs in by email only — resolve a username to its email first.
    if (!email.includes("@")) {
      const { data, error: lookupError } = await supabase.rpc("email_for_username", {
        lookup_username: email,
      });
      if (lookupError || !data) {
        setLoading(false);
        setError(GENERIC_ERROR);
        return;
      }
      email = data;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError(GENERIC_ERROR);
      return;
    }

    if (rememberMe) {
      window.localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier.trim());
    } else {
      window.localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <FormError message={error} /> : null}

      <Input
        label="Email or Username"
        name="identifier"
        autoComplete="username"
        placeholder="Enter your email or username"
        icon={<PersonIcon />}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        disabled={loading}
        required
      />

      <div className="flex flex-col gap-2">
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          icon={<LockIcon />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              className="h-3.5 w-3.5 shrink-0 accent-[var(--color-red-primary)]"
            />
            Remember my login details
          </label>
          <Link href="/forgot-password" className="shrink-0 text-xs font-medium text-red-primary hover:text-red-hover">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" size="lg" loading={loading} disabled={loading}>
        {loading ? "Signing you in..." : "Login"}
      </Button>

      <AuthDivider />
      <SocialAuthButtons />
    </form>
  );
}
