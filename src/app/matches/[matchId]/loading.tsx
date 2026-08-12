import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Footer } from "@/components/layout/Footer";

export default function MatchDetailLoading() {
  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
          <div className="h-48 animate-pulse rounded-card bg-white/5" />
          <div className="flex flex-col gap-3">
            <div className="h-16 animate-pulse rounded-card bg-white/5" />
            <div className="h-16 animate-pulse rounded-card bg-white/5" />
            <div className="h-16 animate-pulse rounded-card bg-white/5" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
