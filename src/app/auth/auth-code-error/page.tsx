import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthVisual } from "@/components/auth/AuthVisual";
import { VerificationErrorPanel } from "@/components/auth/VerificationErrorPanel";

export const metadata: Metadata = {
  title: "Verification Link Issue — United Fans Hub",
  description: "This verification link didn't work — request a new one.",
};

// `code`/`reason` come from /auth/callback's own redirect (Supabase's
// error_code/error_description, forwarded along) — read server-side here
// and passed down as a prop, so VerificationErrorPanel itself never needs
// its own useSearchParams()/Suspense boundary.
export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; reason?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <AuthLayout visual={<AuthVisual />}>
      <VerificationErrorPanel code={code ?? null} />
    </AuthLayout>
  );
}
