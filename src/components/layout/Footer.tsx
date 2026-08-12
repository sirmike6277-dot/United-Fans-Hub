import Link from "next/link";
import { Wordmark } from "./Wordmark";

const productLinks = [
  { href: "#features", label: "Features" },
  { href: "#community", label: "Community" },
  { href: "#matchday", label: "Matches" },
  { href: "#rankings", label: "Rankings" },
];

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

const socialLinks = [
  { href: "https://x.com", label: "X / Twitter" },
  { href: "https://instagram.com", label: "Instagram" },
  { href: "https://tiktok.com", label: "TikTok" },
];

export function Footer() {
  return (
    <footer id="about" className="border-t border-white/10 bg-bg-elevated">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="flex flex-col gap-3">
          <Wordmark />
          <p className="max-w-xs text-sm text-text-muted">
            An independent Manchester United supporters community. Not affiliated with, endorsed
            by, or operated on behalf of Manchester United Football Club.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Product
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-body hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Legal</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-body hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Follow
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-text-body hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-6 text-center text-xs text-text-muted sm:px-6 lg:px-8">
        © {new Date().getFullYear()} United Fans Hub. An independent fan community — unofficial
        and unaffiliated with Manchester United Football Club.
      </div>
    </footer>
  );
}
