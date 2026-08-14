import { Button } from "@/components/ui/Button";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-bg-void py-20 sm:py-28">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(218,41,28,0.25),transparent_60%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-bold uppercase leading-tight text-ink sm:text-5xl">
          Your United.
          <br />
          <span className="text-red-primary">Your community.</span>
        </h2>
        <p className="mt-4 text-text-muted">
          Join thousands of fans who connect, predict, debate, and celebrate together.
        </p>
        <Button href="/signup" size="lg" className="mt-8">
          Join the community
        </Button>
      </div>
    </section>
  );
}
