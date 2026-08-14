import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";
import { AppShell } from "@/components/layout/AppShell";
import { ClubEmblem } from "@/components/media/ClubEmblem";

export interface LegalPageShellProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Shared shell for /terms and /privacy — previously both were hard 404s
 * (no route existed for either), linked from Footer.tsx and the signup
 * consent checkbox. Same signed-in/signed-out shell-choosing pattern
 * already established by /matches/page.tsx: a signed-in visitor reading
 * the terms still gets their normal Sidebar/AppShell, a signed-out
 * visitor (the far more common case — reading terms *before* having an
 * account) gets the plain public Navbar/Footer wrapper.
 */
export async function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const signedIn = Boolean(claimsData?.claims.sub);

  const content = (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <ClubEmblem size={56} />
      <h1 className="mt-4 font-display text-2xl font-bold uppercase text-red-primary sm:text-3xl">{title}</h1>
      <p className="mt-2 text-xs uppercase tracking-wide text-text-muted">Last updated {lastUpdated}</p>
      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-text-body">{children}</div>
    </div>
  );

  if (signedIn) {
    return (
      <AppShell>
        <main className="flex-1 bg-bg-void">{content}</main>
      </AppShell>
    );
  }

  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">{content}</main>
      <Footer />
    </>
  );
}
