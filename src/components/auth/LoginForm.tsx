"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "./PasswordInput";
import { AuthDivider } from "./AuthDivider";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { FormError } from "./FormError";
import { PersonIcon, LockIcon } from "./FieldIcons";

const GENERIC_ERROR = "We couldn't sign you in. Please check your details and try again.";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Link
          href="/forgot-password"
          className="self-end text-xs font-medium text-red-primary hover:text-red-hover"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" size="lg" loading={loading} disabled={loading}>
        {loading ? "Signing you in..." : "Login"}
      </Button>

      <AuthDivider />
      <SocialAuthButtons />
    </form>
  );
}
