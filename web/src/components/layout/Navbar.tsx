"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MdipLogo } from "@/components/ui/MdipLogo";
import { LinkButton } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "#method", label: "Method" },
  { href: "#roles", label: "Roles" },
];

const CERTIFICATE_NO = "MDIP-DR-0001";
const noopSubscribe = () => () => {};
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Certificate header band: mark and wordmark, navigation, certificate fields, sign-in. */
export const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Issue date comes from the browser: a date read during prerender would freeze at build time.
  const issued = useSyncExternalStore(noopSubscribe, todayIso, () => "");

  return (
    <header className="guilloche border-b border-rule-strong">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:gap-6 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="MDIP home">
          <MdipLogo variant="color" size={30} />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[22px] font-extrabold tracking-[0.02em] text-ink">MDIP</span>
            <span className="hidden text-xs text-ink-2 sm:block">Manufacturing Decision Intelligence</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-sheet hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <dl className="hidden items-stretch border border-rule-strong bg-sheet text-left lg:flex">
          <div className="border-r border-rule px-3 py-1">
            <dt className="text-xs text-ink-3">Certificate no.</dt>
            <dd className="font-mono-numbers text-xs text-ink">{CERTIFICATE_NO}</dd>
          </div>
          <div className="px-3 py-1">
            <dt className="text-xs text-ink-3">Issued</dt>
            <dd className="font-mono-numbers text-xs text-ink">{issued || "—"}</dd>
          </div>
        </dl>

        <div className="flex shrink-0 items-center gap-2">
          <LinkButton href="/login" variant="ghost" size="md" className="hidden sm:inline-flex">
            Sign in
          </LinkButton>
          <LinkButton href="/login?mode=register" variant="primary" size="md" className="hidden sm:inline-flex">
            Create account
          </LinkButton>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="cursor-pointer rounded-md p-2 text-ink hover:bg-sheet md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-1 border-t border-rule bg-sheet px-5 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-sheet-sunk"
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-2 border-t border-rule pt-3">
            <LinkButton href="/login" variant="secondary" className="flex-1">
              Sign in
            </LinkButton>
            <LinkButton href="/login?mode=register" className="flex-1">
              Create account
            </LinkButton>
          </div>
        </div>
      )}
    </header>
  );
};
