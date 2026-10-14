"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  BookOpen,
  ArrowLeft,
  LogOut,
  Sparkles,
  Layers,
  ShieldCheck,
  Activity
} from "lucide-react";

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenCopilot?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  onOpenCopilot
}) => {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Overview Cockpit",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: "Live"
    },
    {
      name: "IRoom System Hub",
      href: "/dashboard/iroom",
      icon: Layers,
      badge: "5 Modules"
    },
    {
      name: "AI Scheduler (WBS)",
      href: "/dashboard/scheduler",
      icon: CalendarClock,
      badge: "CPM"
    },
    {
      name: "Knowledge Base (SOPs)",
      href: "/dashboard/knowledge",
      icon: BookOpen,
      badge: "RAG"
    },
    {
      name: "AI Copilot Console",
      href: "/dashboard/copilot",
      icon: Sparkles,
      badge: "Grounded"
    }
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#0c1a2d]/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#0c1a2d] text-[#cad8e8] flex flex-col z-50 border-r border-[#1e3450] transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#172d47] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] flex items-center justify-center font-extrabold text-white text-base shadow-[0_4px_16px_rgba(37,99,235,0.35)] shrink-0">
            M
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-white tracking-tight text-[15px] flex items-center gap-1.5 truncate">
              MDIP Copilot
            </div>
            <div className="text-[10px] text-[#7994b2] font-mono-numbers uppercase tracking-wider truncate">
              BINUS RTT & IMAJIN
            </div>
          </div>
        </div>

        {/* Scrollable Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-widest text-[#627d9e] uppercase">
              Operational Intelligence
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      active
                        ? "bg-[#1c3654] text-white shadow-sm font-semibold translate-x-1 border border-[#2b4c73]"
                        : "text-[#9cb5ce] hover:bg-[#142842] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#38bdf8]" : "text-[#7994b2]"}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-mono-numbers px-1.5 py-0.5 rounded ${
                        active ? "bg-[#2563eb] text-white font-bold" : "bg-[#162940] text-[#7994b2]"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick AI Trigger */}
          <div className="p-3 bg-[#112338] rounded-xl border border-[#1d3858]">
            <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Grounded Copilot</span>
            </div>
            <p className="text-[11px] text-[#8aa3be] mb-2.5 leading-snug">
              Instant answers grounded in indexed SOPs and project constraints.
            </p>
            <button
              onClick={() => {
                onCloseMobile();
                onOpenCopilot?.();
              }}
              className="w-full py-1.5 px-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Ask Manufacturing AI
            </button>
          </div>
        </div>

        {/* Footer Links */}
        <div className="p-3 border-t border-[#172d47] space-y-1 text-xs">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#9cb5ce] hover:bg-[#142842] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#7994b2]" />
            <span>Public Architecture</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#9cb5ce] hover:bg-[#142842] hover:text-white transition"
          >
            <LogOut className="w-4 h-4 text-[#7994b2]" />
            <span>Switch Role / Sign Out</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
