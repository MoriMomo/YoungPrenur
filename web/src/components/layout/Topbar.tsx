"use client";

import React, { useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, RotateCcw, ChevronDown, MessageSquareText, Shield, LogOut } from "lucide-react";
import { ManufacturingRole, DeploymentMode } from "@/types";
import { ROLES } from "@/lib/mock-data";
import gsap from "gsap";

interface TopbarProps {
  selectedRole: ManufacturingRole;
  onSelectRole: (role: ManufacturingRole) => void;
  deploymentMode: DeploymentMode;
  onChangeDeploymentMode: (mode: DeploymentMode) => void;
  onRefresh: () => void;
  isApiLive: boolean;
  onOpenMobileMenu: () => void;
  onOpenCopilot: () => void;
  userName?: string | null;
  onSignOut?: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Overview Cockpit",
  "/dashboard/iroom": "IRoom Telemetry Hub",
  "/dashboard/scheduler": "AI Project Scheduler (WBS)",
  "/dashboard/knowledge": "Knowledge Base & SOPs",
  "/dashboard/copilot": "AI Copilot Console",
};

export const Topbar: React.FC<TopbarProps> = ({
  selectedRole,
  onSelectRole,
  deploymentMode,
  onChangeDeploymentMode,
  onRefresh,
  isApiLive,
  onOpenMobileMenu,
  onOpenCopilot,
  userName,
  onSignOut,
}) => {
  const pathname = usePathname();
  const refreshIconRef = useRef<SVGSVGElement>(null);

  const currentTitle = ROUTE_TITLES[pathname] || "Workspace";

  const handleRefreshClick = () => {
    if (refreshIconRef.current) {
      gsap.to(refreshIconRef.current, {
        rotation: "+=360",
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
    onRefresh();
  };

  return (
    <header className="h-14 bg-white border-b border-[#e5e7eb] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile trigger & Route Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 text-[#4b5565] hover:text-[#111827] hover:bg-[#f3f4f6] rounded-lg transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#4b5565] min-w-0 truncate">
          <span className="hidden sm:inline font-medium">MDIP</span>
          <span className="hidden sm:inline text-[#9ca3af]">/</span>
          <span className="font-medium text-[#111827] truncate">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Right: API Status, Deployment Mode, Role Switcher, Refresh, Copilot */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Truthful API / Sandbox Indicator */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2 text-xs font-mono-numbers text-[#64748b]"
          title={
            isApiLive
              ? "FastAPI PoC service responding"
              : "Offline mode: running calibrated TRL 4 sample dataset"
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isApiLive ? "bg-[#16a34a]" : "bg-[#d97706]"
            }`}
          />
          <span>{isApiLive ? "API Connected" : "TRL 4 Sandbox"}</span>
        </div>

        {/* SaaS vs On-Premise VPC Toggle */}
        <div
          className="hidden md:flex items-center h-8 bg-[#f3f4f6] p-0.5 rounded-lg border border-[#e5e7eb] text-xs"
          role="group"
          aria-label="Deployment architecture mode"
        >
          <button
            type="button"
            onClick={() => onChangeDeploymentMode("saas")}
            className={`h-7 px-2.5 rounded-md font-medium transition-colors cursor-pointer ${
              deploymentMode === "saas"
                ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-[#4b5565] hover:text-[#111827]"
            }`}
          >
            SaaS
          </button>
          <button
            type="button"
            onClick={() => onChangeDeploymentMode("internal")}
            className={`flex items-center gap-1 h-7 px-2.5 rounded-md font-medium transition-colors cursor-pointer ${
              deploymentMode === "internal"
                ? "bg-[#111827] text-white"
                : "text-[#4b5565] hover:text-[#111827]"
            }`}
            title="Isolates CAD drawings and PO data inside plant VPC (UU PDP / IP safety)"
          >
            <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>On-Prem VPC</span>
          </button>
        </div>

        {/* Role Selector */}
        <div className="relative">
          <select
            value={selectedRole}
            onChange={(e) => onSelectRole(e.target.value as ManufacturingRole)}
            className="h-8 appearance-none bg-white hover:bg-[#f9fafb] text-[#111827] text-xs font-medium border border-[#e5e7eb] hover:border-[#d1d5db] rounded-lg pl-3 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 transition-colors"
            aria-label="Select manufacturing role"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748b] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={handleRefreshClick}
          className="h-8 flex items-center gap-1.5 px-2.5 text-xs font-medium text-[#374151] bg-white hover:bg-[#f9fafb] border border-[#e5e7eb] rounded-lg transition-colors cursor-pointer"
          title="Check backend health and refresh telemetry"
          aria-label="Refresh telemetry data"
        >
          <RotateCcw ref={refreshIconRef} className="w-3.5 h-3.5 text-[#64748b]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Single Global Copilot Trigger */}
        <button
          type="button"
          onClick={onOpenCopilot}
          className="h-8 flex items-center gap-1.5 px-3 bg-[#111827] hover:bg-[#1f2937] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          aria-label="Open Manufacturing Copilot"
        >
          <MessageSquareText className="w-3.5 h-3.5 text-[#9ca3af]" strokeWidth={1.5} />
          <span className="hidden sm:inline">Copilot</span>
        </button>

        {userName && onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="h-8 flex items-center gap-1.5 px-2.5 text-xs font-medium text-[#4b5565] hover:text-[#111827] bg-white hover:bg-[#f9fafb] border border-[#e5e7eb] rounded-lg transition-colors cursor-pointer"
            title={`Signed in as ${userName} — click to sign out`}
            aria-label="Sign out"
          >
            <span className="hidden xl:inline max-w-[96px] truncate">{userName}</span>
            <LogOut className="w-3.5 h-3.5 text-[#64748b]" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
};
