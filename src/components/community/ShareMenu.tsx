"use client";

import { useEffect, useRef, useState } from "react";
import { getSiteUrl } from "@/lib/site-url";
import { ShareIcon, XIcon, FacebookIcon, WhatsAppIcon, LinkIcon, CheckIcon } from "./CommunityIcons";

export interface ShareMenuProps {
  postId: string;
  /** First line or so of the post, used as the share text — falls back to a generic line for a media-only post with no body. */
  shareText?: string;
}

/**
 * Replaces the old "Share" link, which just navigated to the post's own
 * permalink page — not a share action at all, and the reported bug this
 * fixes. Real sharing now: on a device with the native Web Share API
 * (most phones), tapping Share opens the OS's own share sheet directly —
 * the best available option there, since it includes every app the user
 * actually has installed, not a fixed list we'd have to guess at. Where
 * that's unavailable (most desktop browsers), it falls back to this
 * dropdown with direct share-intent links for X, Facebook, and WhatsApp,
 * plus copy-link.
 */
export function ShareMenu({ postId, shareText }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function getShareUrl(): string {
    return `${getSiteUrl()}/community/${postId}`;
  }

  async function handleTriggerClick() {
    const url = getShareUrl();
    const text = shareText?.trim() || "Check out this post on United Fans Hub";

    // Prefer the OS share sheet where it exists — it's a real capability
    // check, not a viewport/UA sniff, so it also covers desktop browsers
    // that happen to support it.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "United Fans Hub", text, url });
        return;
      } catch (err) {
        // AbortError just means the user closed the native sheet without
        // picking anything — not a failure, don't fall through to the
        // dropdown in that case. Any other error, fall back to it.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    setOpen((v) => !v);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      // Clipboard API can be denied/unavailable — the link is still right
      // there in the address bar of the intent links below, so this isn't
      // a dead end, just no one-click copy.
    }
  }

  const url = getShareUrl();
  const text = shareText?.trim() || "Check out this post on United Fans Hub";
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const platforms = [
    { name: "X", Icon: XIcon, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}` },
    { name: "Facebook", Icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: "WhatsApp", Icon: WhatsAppIcon, href: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 min-w-[44px] items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-primary"
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {open ? (
        <div role="menu" aria-label="Share this post" className="absolute left-0 z-20 mt-2 w-56 rounded-control border border-white/10 bg-bg-elevated p-1.5 shadow-lg">
          {platforms.map(({ name, Icon, href }) => (
            <a
              key={name}
              role="menuitem"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm text-text-body transition-colors hover:bg-white/5"
            >
              <Icon />
              <span>Share to {name}</span>
            </a>
          ))}
          <div className="my-1 border-t border-white/10" />
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm text-text-body transition-colors hover:bg-white/5"
          >
            {copied ? <CheckIcon /> : <LinkIcon />}
            <span>{copied ? "Link copied!" : "Copy link"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
