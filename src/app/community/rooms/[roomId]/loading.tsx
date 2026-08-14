import { Navbar } from "@/components/layout/Navbar";
import { Brand } from "@/components/layout/Brand";
import { Sidebar } from "@/components/layout/Sidebar";

export default function RoomLoading() {
  return (
    <>
      <Navbar brand={<Brand />} />
      <main className="flex-1 bg-bg-void">
        <div className="mx-auto flex w-full max-w-[1440px] items-start px-4 sm:px-6 lg:px-8">
          <Sidebar />
          <div className="flex h-[calc(100dvh-4rem)] min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-ink/10" aria-hidden="true" />
              <div className="h-4 w-32 animate-pulse rounded bg-ink/10" aria-hidden="true" />
            </div>
            <div className="flex-1 px-4 py-4" aria-live="polite" aria-label="Loading room">
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 w-2/3 animate-pulse rounded-card bg-ink/5" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
