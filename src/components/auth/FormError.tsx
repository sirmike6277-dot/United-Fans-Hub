export interface FormErrorProps {
  message: string;
}

/**
 * Accessible error banner for auth forms. Rendered conditionally by the
 * form (never hard-coded into the default view) — see LoginForm/SignupForm.
 * `role="alert"` + `aria-live` ensure screen readers announce it the moment
 * it appears, without needing focus to move.
 */
export function FormError({ message }: FormErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-control border border-red-primary/40 bg-red-primary/10 px-4 py-3 text-sm text-ink"
    >
      {message}
    </div>
  );
}
