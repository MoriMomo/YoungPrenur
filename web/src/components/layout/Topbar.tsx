"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, RotateCcw, ChevronDown, MessageSquareText, Shield, LogOut } from "lucide-react";
import { ManufacturingRole, DeploymentMode } from "@/types";
import { ROLES } from "@/lib/mock-data";
import { buttonClass } from "@/components/ui/Button";
import { LangSwitch, useT } from "@/lib/i18n";

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

const ROUTE_TITLES: Record<string, [string, string]> = {
  "/dashboard": ["Overview", "Ringkasan"],
  "/dashboard/iroom": ["IRoom streams", "Aliran IRoom"],
  "/dashboard/scheduler": ["Scheduler", "Penjadwal"],
  "/dashboard/knowledge": ["SOP knowledge", "Pengetahuan SOP"],
  "/dashboard/copilot": ["Copilot", "Copilot"],
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
  const t = useT();
  const currentTitle = t(...(ROUTE_TITLES[pathname] ?? ["Workspace", "Workspace"]));

  const handleRefreshClick = () => {
    onRefresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-rule-strong bg-sheet px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="-ml-2 cursor-pointer rounded-md p-2.5 text-ink-2 hover:bg-sheet-sunk hover:text-ink lg:hidden"
          aria-label={t("Open navigation menu", "Buka menu navigasi")}
        >
          <Menu className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <span className="truncate whitespace-nowrap text-sm font-medium text-ink">{currentTitle}</span>
        <span
          className="hidden items-center gap-1.5 whitespace-nowrap text-xs text-ink-3 xl:flex"
          title={
            isApiLive
              ? t("The MDIP service is responding", "Layanan MDIP merespons")
              : t("The MDIP service is offline; showing sample data", "Layanan MDIP offline; menampilkan data contoh")
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isApiLive ? "bg-pass" : "bg-warn"}`} aria-hidden="true" />
          {isApiLive ? t("Live", "Langsung") : t("Sample data", "Data contoh")}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="hidden sm:block">
          <LangSwitch />
        </div>
        <div
          className="hidden h-8 items-center rounded-md border border-rule-strong bg-sheet-sunk p-0.5 text-xs xl:flex"
          role="group"
          aria-label={t("Deployment mode", "Mode deployment")}
        >
          {(["saas", "internal"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={deploymentMode === mode}
              aria-label={mode === "saas" ? "Cloud" : "On-premises"}
              onClick={() => onChangeDeploymentMode(mode)}
              title={
                mode === "internal"
                  ? t("The MDIP server handles documents and Copilot questions locally.", "Server MDIP menangani dokumen dan pertanyaan Copilot secara lokal.")
                  : t(
                      "DeepSeek or Google Gemini may read PDF and Word schedules. DeepSeek or Gemini may process Copilot questions and retrieved context.",
                      "DeepSeek atau Google Gemini dapat membaca jadwal PDF dan Word. DeepSeek atau Gemini dapat memproses pertanyaan Copilot dan konteks yang diambil."
                    )
              }
              className={`flex h-7 cursor-pointer items-center gap-1 whitespace-nowrap rounded-sm px-2.5 font-medium transition-colors ${
                deploymentMode === mode ? "bg-sheet text-ink shadow-sm" : "text-ink-2 hover:text-ink"
              }`}
            >
              {mode === "internal" && <Shield className="h-3.5 w-3.5" strokeWidth={1.6} />}
              {mode === "saas" ? "Cloud" : "On-premises"}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={selectedRole}
            onChange={(e) => onSelectRole(e.target.value as ManufacturingRole)}
            className="h-8 max-w-36 sm:max-w-none cursor-pointer appearance-none truncate rounded-md border border-rule-strong bg-sheet pl-3 pr-8 text-xs font-medium text-ink hover:bg-sheet-sunk"
            aria-label={t("Viewing as role", "Melihat sebagai peran")}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t(role)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
            strokeWidth={1.6}
          />
        </div>

        <button
          type="button"
          onClick={handleRefreshClick}
          className={buttonClass("secondary", "sm")}
          title={t("Check the service and refresh data", "Periksa layanan dan muat ulang data")}
          aria-label={t("Refresh data", "Muat ulang data")}
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} />
          <span className="hidden sm:inline">{t("Refresh", "Muat ulang")}</span>
        </button>

        <button type="button" onClick={onOpenCopilot} className={buttonClass("primary", "sm")} aria-label={t("Open the copilot", "Buka copilot")}>
          <MessageSquareText className="h-3.5 w-3.5" strokeWidth={1.6} />
          <span className="hidden sm:inline">{t("Ask copilot", "Tanya copilot")}</span>
        </button>

        {userName && onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className={buttonClass("ghost", "sm")}
            title={t(`Signed in as ${userName}. Sign out`, `Masuk sebagai ${userName}. Keluar`)}
            aria-label={t("Sign out", "Keluar")}
          >
            <span className="hidden max-w-[110px] truncate 2xl:inline">{userName}</span>
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
        )}
      </div>
    </header>
  );
};
