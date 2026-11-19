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

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingActionsCount: number;
  isApiLive: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  pendingActionsCount,
  isApiLive,
}) => {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Overview Cockpit",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: pendingActionsCount > 0 ? String(pendingActionsCount) : "0",
      badgeAlert: pendingActionsCount > 0,
    },
    {
      name: "IRoom Telemetry",
      href: "/dashboard/iroom",
      icon: Layers,
      badge: "5",
      badgeAlert: false,
    },
    {
      name: "AI Scheduler",
      href: "/dashboard/scheduler",
      icon: CalendarClock,
      badge: "CPM",
      badgeAlert: false,
    },
    {
      name: "SOP Knowledge",
      href: "/dashboard/knowledge",
      icon: BookOpen,
      badge: "4",
      badgeAlert: false,
    },
    {
      name: "AI Copilot Console",
      href: "/dashboard/copilot",
      icon: MessageSquareText,
      badge: "RAG",
      badgeAlert: false,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#0c1a2d]/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#0d131c] text-[#eef0f5] flex flex-col z-50 border-r border-white/8 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-white/8 flex items-center gap-3">
          <MdipLogo variant="light" size={30} className="shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-[#eef0f5] text-[15px] truncate">
              MDIP Copilot
            </div>
          </div>
        </div>

        {/* Navigation + Action Queue */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col justify-between gap-6">
          <div>
            <div className="px-3 mt-2 mb-2 text-xs font-medium text-[#8f98ab]">
              Navigation
            </div>
            <nav aria-label="Dashboard navigation" className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between h-9 px-3 rounded-lg text-[13px] transition-colors ${
                      active
                        ? "bg-[#1a2230] text-[#eef0f5] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-[#a3a9b8] font-normal hover:bg-[#151d2a] hover:text-[#eef0f5]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? "text-[#eef0f5]" : "text-[#8f98ab]"}`}
                        strokeWidth={1.5}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-numbers text-[#8f98ab] whitespace-nowrap shrink-0">
                        {item.badgeAlert && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e5484d] shrink-0" />
                        )}
                        <span>{item.badge}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Action Queue */}
          <div className="p-3.5 bg-[#131b26] rounded-xl border border-white/8 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#eef0f5]">
              <span>Action Queue</span>
              <span className="text-[11px] font-mono-numbers text-[#8f98ab]">
                {pendingActionsCount} HITL
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <Link
                href="/dashboard"
                onClick={onCloseMobile}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0d131c] hover:bg-[#1a2230] text-[#a3a9b8] hover:text-[#eef0f5] transition-colors"
              >
                <span className="truncate">HITL Decisions Open</span>
                <span className="font-mono-numbers text-[#fbbf24] font-medium shrink-0">
                  {pendingActionsCount} open
                </span>
              </Link>
              <Link
                href="/dashboard/iroom?tab=material"
                onClick={onCloseMobile}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0d131c] hover:bg-[#1a2230] text-[#a3a9b8] hover:text-[#eef0f5] transition-colors"
              >
                <span className="truncate">INGOT-AL7075-T6 Cover</span>
                <span className="font-mono-numbers text-[#f87171] font-medium shrink-0">
                  36h left
                </span>
              </Link>
              <Link
                href="/dashboard/iroom?tab=operations"
                onClick={onCloseMobile}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0d131c] hover:bg-[#1a2230] text-[#a3a9b8] hover:text-[#eef0f5] transition-colors"
              >
                <span className="truncate">Press P-07 Sensor</span>
                <span className="font-mono-numbers text-[#fbbf24] font-medium shrink-0">
                  +18% vib
                </span>
              </Link>
            </div>

            <div className="pt-2 border-t border-white/8 flex items-center gap-2 text-[11px] text-[#8f98ab]">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isApiLive ? "bg-[#4cc38a]" : "bg-[#f59e0b]"}`} />
              <span>{isApiLive ? "FastAPI PoC Connected" : "TRL 4 Simulation Sandbox"}</span>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="p-3 border-t border-white/8 space-y-1 text-xs">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 h-9 rounded-lg text-[#a3a9b8] hover:bg-[#151d2a] hover:text-[#eef0f5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#8f98ab]" strokeWidth={1.5} />
            <span>Public Architecture</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2.5 px-3 h-9 rounded-lg text-[#a3a9b8] hover:bg-[#151d2a] hover:text-[#eef0f5] transition-colors"
          >
            <LogOut className="w-4 h-4 text-[#8f98ab]" strokeWidth={1.5} />
            <span>Switch Role / Sign Out</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
