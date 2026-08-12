import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page Not Found — United Fans Hub",
};

/**
 * Rendered inside the root layout (unlike global-error.tsx, which replaces
 * it entirely) — the root app tree is healthy here, just the requested URL
 * isn't real, so it's safe to use the full server-rendered Brand/Navbar/
 * Footer exactly like any other page.
 */
export default function NotFound() {
  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex flex-1 items-center justify-center bg-bg-void px-4 py-24">
        <div className="max-w-sm text-center">
          <p className="font-display text-6xl font-bold text-red-primary">404</p>
          <p className="mt-4 font-display text-xl font-bold text-white">Page not found</p>
          <p className="mt-2 text-sm text-text-muted">
            We couldn&apos;t find the page you were looking for. It may have moved, or the link might be
            incorrect.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button href="/">Go home</Button>
            <Button href="/matches" variant="secondary">
              Match Centre
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
