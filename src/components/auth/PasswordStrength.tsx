export interface PasswordStrengthProps {
  password: string;
}

type Strength = "empty" | "weak" | "fair" | "strong";

function getStrength(password: string): Strength {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}

// Deliberately stays within the brand palette (red / white) rather than
// introducing a semantic green — see docs/architecture for why.
const styles: Record<Strength, { label: string; bars: number; className: string }> = {
  empty: { label: "", bars: 0, className: "bg-white/10" },
  weak: { label: "Weak", bars: 1, className: "bg-red-deep" },
  fair: { label: "Fair", bars: 2, className: "bg-red-primary" },
  strong: { label: "Strong", bars: 3, className: "bg-white" },
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getStrength(password);
  if (strength === "empty") return null;
  const { label, bars, className } = styles[strength];

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < bars ? className : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
