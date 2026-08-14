/** Inline SVG glyphs for the feed — matches the icon convention already established in landing/FeatureIcons.tsx, no icon library dependency. */

function iconProps(strokeWidth = 1.75) {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 20.2 4.7 13.2C2.4 11 2.5 7.3 5 5.4c2.2-1.7 5.3-1.2 6.9.9L12 6.6l.1-.3c1.6-2.1 4.7-2.6 6.9-.9 2.5 1.9 2.6 5.6.3 7.8L12 20.2Z" />
      </svg>
    );
  }
  return (
    <svg {...iconProps()}>
      <path d="M12 20.2 4.7 13.2C2.4 11 2.5 7.3 5 5.4c2.2-1.7 5.3-1.2 6.9.9L12 6.6l.1-.3c1.6-2.1 4.7-2.6 6.9-.9 2.5 1.9 2.6 5.6.3 7.8L12 20.2Z" />
    </svg>
  );
}

export function CommentIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 5h16v11H9l-4 4v-4H4V5Z" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M4 17.5 9 13l3 2.5 4.5-4.5 3.5 3.5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M20 11A8 8 0 1 0 18.5 16" />
      <path d="M20 6v5h-5" />
    </svg>
  );
}

export function ReplyIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M9 6 3 12l6 6M3 12h11a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

/** Share-menu icons — platform glyphs (recognisable brand shapes, used only for outbound share links, the standard fair-use case every share sheet relies on) plus the generic link/copy/check states. */

export function XIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2.6h3.1l-6.8 7.8 8 10.5h-6.3l-4.9-6.4-5.6 6.4H3.3l7.3-8.3-7.7-10h6.4l4.4 5.8Zm-1.1 16.4h1.7L7.3 4.4H5.5Z" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.4.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z" />
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M9 12h6M8.5 16H7a4 4 0 1 1 0-8h1.5M15.5 8H17a4 4 0 1 1 0 8h-1.5" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 19h14" />
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <svg {...iconProps(2)}>
      <path d="M9 4H4v5M20 9V4h-5M4 15v5h5M15 20h5v-5" />
    </svg>
  );
}
