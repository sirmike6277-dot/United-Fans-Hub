import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

/** Same visual language as Input — no select primitive existed anywhere in this app yet (Predictions is the first feature needing one, for first-scorer/MOTM choice). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = "", children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={`h-11 w-full rounded-control border bg-bg-elevated px-4 text-sm text-ink outline-none transition-colors focus:border-red-primary ${
            error ? "border-red-hover" : "border-ink/10"
          } ${className}`}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error && selectId ? `${selectId}-error` : undefined}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <span id={selectId ? `${selectId}-error` : undefined} className="text-xs text-red-hover">
            {error}
          </span>
        ) : null}
      </div>
    );
  },
);

Select.displayName = "Select";
