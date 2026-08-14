import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Optional leading icon (e.g. a field-type glyph in auth forms). */
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-xs font-medium uppercase tracking-wide text-text-muted"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-text-muted">
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={`h-11 w-full rounded-control border bg-bg-elevated text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary ${
              icon ? "pl-11 pr-4" : "px-4"
            } ${error ? "border-red-hover" : "border-ink/10"} ${className}`}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
        {error ? (
          <span id={inputId ? `${inputId}-error` : undefined} className="text-xs text-red-hover">
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
