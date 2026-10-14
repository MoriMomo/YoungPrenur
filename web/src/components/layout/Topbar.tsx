"use client";

import React, { useRef } from "react";
import { Menu, RotateCcw, ChevronDown, Sparkles } from "lucide-react";
import { ManufacturingRole } from "@/types";
import { ROLES } from "@/lib/mock-data";
import gsap from "gsap";

interface TopbarProps {
  currentTitle?: string;
  selectedRole: ManufacturingRole;
  onSelectRole: (role: ManufacturingRole) => void;
  onRefresh: () => void;
  isApiLive: boolean;
  onOpenMobileMenu: () => void;
  onOpenCopilot: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTitle = "Workspace",
  selectedRole,
  onSelectRole,
  onRefresh,
  isApiLive,
  onOpenMobileMenu,
  onOpenCopilot,
}) => {
  const refreshIconRef = useRef<SVGSVGElement>(null);

  const handleRefreshClick = () => {
    if (refreshIconRef.current) {
      gsap.to(refreshIconRef.current, {
        rotation: "+=360",
        duration: 0.6,
        ease: "power2.inOut",
      });
    }
    onRefresh();
  };

  return (
    <header className="h-16 bg-white border-b border-[#e2eaf3] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(12,26,45,0.03)]">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-[#536780] hover:text-[#101e30] hover:bg-[#f1f5f9] rounded-lg transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#536780] min-w-0 truncate">
          <span className="hidden sm:inline font-medium">MDIP</span>
          <span className="hidden sm:inline text-[#94a3b8]">/</span>
          <span className="font-semibold text-[#101e30] tracking-tight truncate">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Right: API status, Role switcher, Refresh, Copilot */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* API Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
            isApiLive
              ? "bg-[#e6f7f0] text-[#0d9263] border border-[#a7f3d0]"
              : "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]"
          }`}
          title={isApiLive ? "FastAPI backend live at http://localhost:8000" : "Standalone mode using verified local dataset"}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isApiLive ? "bg-[#10b981] pulsing-dot" : "bg-[#94a3b8]"
            }`}
          />
          <span className="hidden md:inline">
            {isApiLive ? "API Connected" : "Client Fallback Mode"}
          </span>
          <span className="md:hidden">{isApiLive ? "Live" : "Mock"}</span>
        </div>

        {/* Role Selector */}
        <div className="relative">
          <select
            value={selectedRole}
            onChange={(e) => onSelectRole(e.target.value as ManufacturingRole)}
            className="appearance-none bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#101e30] text-xs sm:text-sm font-medium border border-[#cbd5e1] hover:border-[#94a3b8] rounded-lg pl-3 pr-8 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 transition-all shadow-sm"
            aria-label="Select manufacturing role"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Refresh Button with GSAP rotation */}
        <button
          onClick={handleRefreshClick}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#334155] bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#cbd5e1] rounded-lg transition-all shadow-sm hover:text-[#0f172a]"
          title="Refresh project telemetry data"
          aria-label="Refresh telemetry data"
        >
          <RotateCcw ref={refreshIconRef} className="w-3.5 h-3.5 text-[#64748b]" />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Copilot Header Button */}
        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-semibold shadow-sm transition"
          aria-label="Open AI Copilot"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Copilot</span>
        </button>
      </div>
    </header>
  );
};
