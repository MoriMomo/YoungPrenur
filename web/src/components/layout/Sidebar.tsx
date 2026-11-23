"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdipLogo } from "@/components/ui/MdipLogo";
import {
  LayoutDashboard,
  CalendarClock,
  BookOpen,
  ArrowLeft,
  LogOut,
  MessageSquareText,
  Layers,
} from "lucide-react";
import { LangSwitch, useT } from "@/lib/i18n";

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingActionsCount: number;
  isApiLive: boolean;
}

const NAV: { name: [string, string]; href: string; icon: typeof Layers }[] = [
  { name: ["Overview", "Ringkasan"], href: "/dashboard", icon: LayoutDashboard },
  { name: ["IRoom streams", "Aliran IRoom"], href: "/dashboard/iroom", icon: Layers },
  { name: ["Scheduler", "Penjadwal"], href: "/dashboard/scheduler", icon: CalendarClock },
  { name: ["SOP knowledge", "Pengetahuan SOP"], href: "/dashboard/knowledge", icon: BookOpen },
  { name: ["Copilot", "Copilot"], href: "/dashboard/copilot", icon: MessageSquareText },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpenMobile, onCloseMobile, pendingActionsCount, isApiLive }) => {
  const pathname = usePathname();
  const t = useT();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href));

  return (
    <>
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-60 flex-col border-r border-rule-strong bg-sheet text-ink transition-transform duration-300 lg:sticky lg:h-screen lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard" onClick={onCloseMobile} className="flex items-center gap-2.5 border-b border-rule-strong px-4 py-4">
          <MdipLogo variant="color" size={28} className="shrink-0" />
          <span className="font-display text-[22px] font-extrabold tracking-[0.02em]">MDIP</span>
        </Link>

        <nav aria-label={t("Dashboard", "Dasbor")} className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center justify-between rounded-md px-3 text-sm transition-colors ${
                  active
                    ? "bg-stamp-wash font-medium text-stamp-deep"
                    : "text-ink-2 hover:bg-sheet-sunk hover:text-ink"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                  <span className="truncate">{t(...item.name)}</span>
                </span>
                {item.href === "/dashboard" && pendingActionsCount > 0 && (
                  <span className="font-mono-numbers text-xs text-warn" aria-label={t(`${pendingActionsCount} decisions awaiting sign-off`, `${pendingActionsCount} keputusan menunggu pengesahan`)}>
                    {pendingActionsCount}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mt-6 border-t border-rule-strong pt-4">
            <p className="px-3 text-xs font-medium text-ink-2">{t("Awaiting sign-off", "Menunggu pengesahan")}</p>
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className="mt-1.5 flex h-9 items-center justify-between rounded-md px-3 text-sm text-ink hover:bg-sheet-sunk"
            >
              <span>{t("Decisions", "Keputusan")}</span>
              <span className="font-mono-numbers text-warn">{pendingActionsCount}</span>
            </Link>
          </div>
        </nav>

        <div className="space-y-0.5 border-t border-rule-strong px-2.5 py-3 text-sm">
          {/* Phones: the top bar has no room for the language switch, so it lives here. */}
          <div className="px-3 pb-2 sm:hidden">
            <LangSwitch className="w-fit" />
          </div>
          <p className="flex items-center gap-2 px-3 pb-2 text-xs text-ink-2">
            <span className={`h-1.5 w-1.5 rounded-full ${isApiLive ? "bg-pass" : "bg-warn"}`} aria-hidden="true" />
            {isApiLive ? t("Live data from the MDIP service", "Data langsung dari layanan MDIP") : t("Offline mode (local cache)", "Mode offline (cache lokal)")}
          </p>
          <Link href="/" className="flex h-9 items-center gap-2.5 rounded-md px-3 text-ink-2 hover:bg-sheet-sunk hover:text-ink">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
            <span>{t("Public site", "Situs publik")}</span>
          </Link>
          <Link href="/login" className="flex h-9 items-center gap-2.5 rounded-md px-3 text-ink-2 hover:bg-sheet-sunk hover:text-ink">
            <LogOut className="h-4 w-4" strokeWidth={1.6} />
            <span>{t("Switch role or sign out", "Ganti peran atau keluar")}</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
