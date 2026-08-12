export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-xs text-text-muted">or continue with</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
