import Link from "next/link";

export interface AuthFooterProps {
  prompt: string;
  linkText: string;
  href: string;
}

export function AuthFooter({ prompt, linkText, href }: AuthFooterProps) {
  return (
    <p className="text-center text-sm text-text-muted">
      {prompt}{" "}
      <Link
        href={href}
        className="font-medium text-red-primary underline-offset-4 hover:text-red-hover hover:underline"
      >
        {linkText}
      </Link>
    </p>
  );
}
