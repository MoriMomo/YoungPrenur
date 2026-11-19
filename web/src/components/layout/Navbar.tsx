"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { MdipLogo } from "@/components/ui/MdipLogo";

const NAV_LINKS = [
  { href: "#features", label: "Platform" },
  { href: "#role-matrix", label: "Solutions" },
  { href: "#research", label: "How we work" },
];

export const Navbar: React.FC = () => {
  const [activeHref, setActiveHref] = useState<string>("#features");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xs border-b border-[#e5e7eb]">
      <div className="max-w-7xl mx-auto h-16 px-6 sm:px-10 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <MdipLogo variant="color" size={30} />
          <span className="font-semibold text-[#0a0a0a] text-[18px] tracking-tight">
            MDIP
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setActiveHref(link.href)}
                className={`px-3.5 py-2 rounded-md text-[14px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#edf7f5] text-[#0a0a0a]"
                    : "text-[#111827] hover:bg-[#f3f4f6]"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-5 shrink-0">
          <Link
            href="/login"
            className="hidden sm:inline-block text-[14px] font-medium text-[#111827] hover:text-[#0d556e] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/login?mode=register"
            className="hidden sm:inline-flex h-10 px-5 items-center bg-[#0a0a0a] hover:bg-[#1f2937] text-white text-[14px] font-medium rounded-full transition-colors"
          >
            Sign up
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-[#111827] hover:bg-[#f3f4f6] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" strokeWidth={1.5} />
            ) : (
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#e5e7eb] bg-white px-6 py-4 space-y-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => {
                setActiveHref(link.href);
                setMobileOpen(false);
              }}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                activeHref === link.href
                  ? "bg-[#edf7f5] text-[#0a0a0a]"
                  : "text-[#111827] hover:bg-[#f3f4f6]"
              }`}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-[#e5e7eb] flex items-center gap-3">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex-1 h-10 inline-flex items-center justify-center border border-[#e5e7eb] rounded-full text-sm font-medium text-[#111827]"
            >
              Log in
            </Link>
            <Link
              href="/login?mode=register"
              onClick={() => setMobileOpen(false)}
              className="flex-1 h-10 inline-flex items-center justify-center bg-[#0a0a0a] text-white rounded-full text-sm font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
