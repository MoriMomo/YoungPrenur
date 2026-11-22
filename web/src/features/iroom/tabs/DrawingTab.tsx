"use client";

import React from "react";
import { Eye, CheckCircle2, Check, MessageSquareText } from "lucide-react";
import { DrawingApprovalItem } from "@/types";
import { IRoomTable } from "../IRoomTable";
import { useT } from "@/lib/i18n";

export interface DrawingTabProps {
  searchQuery: string;
  handleInspectWithAI: (entityName: string, detail: string) => void;
  drawings: DrawingApprovalItem[];
  selectedDrawing: DrawingApprovalItem;
  setSelectedDwgId: React.Dispatch<React.SetStateAction<string>>;
  activeRevision: "Rev 2.0" | "Rev 3.1";
  setActiveRevision: React.Dispatch<React.SetStateAction<"Rev 2.0" | "Rev 3.1">>;
  showGdtOverlay: boolean;
  setShowGdtOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  handleApproveSelectedDrawing: () => Promise<void>;
}

export function DrawingTab({ searchQuery, handleInspectWithAI, drawings, selectedDrawing, setSelectedDwgId, activeRevision, setActiveRevision, showGdtOverlay, setShowGdtOverlay, handleApproveSelectedDrawing }: DrawingTabProps) {
  const t = useT();
  return (
    <div className="space-y-5">
      <div className="bg-paper rounded-xl p-4 sm:p-5 border border-rule-strong text-ink overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-rule-strong">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-stamp text-white font-mono-numbers">
                {t("CAD GD&T Inspector", "Inspektur CAD GD&T")}
              </span>
              <span className="text-xs text-stamp font-mono-numbers">
                {selectedDrawing.dwgNumber} · {selectedDrawing.revision}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  selectedDrawing.status === "Approved"
                    ? "bg-pass text-white"
                    : "bg-warn text-white"
                }`}
              >
                {t(selectedDrawing.status)}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-medium text-ink">
              {selectedDrawing.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-paper p-1 rounded-xl border border-rule-strong">
              <button
                type="button"
                onClick={() => setActiveRevision("Rev 2.0")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeRevision === "Rev 2.0"
                    ? "bg-hold text-white"
                    : "text-ink-3 hover:text-ink"
                }`}
              >
                {t("Rev 2.0 (Baseline)", "Rev 2.0 (Baseline)")}
              </button>
              <button
                type="button"
                onClick={() => setActiveRevision("Rev 3.1")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeRevision === "Rev 3.1"
                    ? "bg-pass text-white"
                    : "text-ink-3 hover:text-ink"
                }`}
              >
                {t("Rev 3.1 (Compensated)", "Rev 3.1 (Dikompensasi)")}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGdtOverlay(!showGdtOverlay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                showGdtOverlay
                  ? "bg-stamp text-sheet border-stamp"
                  : "bg-paper text-ink-2 border-rule-strong"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t("GD&T Overlay:", "Lapisan GD&T:")} {showGdtOverlay ? t("ON", "AKTIF") : t("OFF", "MATI")}</span>
            </button>
          </div>
        </div>

        <div className="relative w-full rounded-xl bg-paper border border-rule-strong overflow-hidden p-2">
          <svg
            viewBox="0 0 760 300"
            className="w-full h-auto block select-none"
            role="img"
            aria-label={t(`CAD blueprint for ${selectedDrawing.dwgNumber}`, `Cetak biru CAD untuk ${selectedDrawing.dwgNumber}`)}
          >
            <rect width="760" height="300" fill="var(--color-paper)" />

            <g stroke="var(--color-sheet-sunk)" strokeWidth="1">
              <path d="M 15 25 L 15 15 L 25 15" fill="none" />
              <path d="M 745 25 L 745 15 L 735 15" fill="none" />
              <path d="M 15 275 L 15 285 L 25 285" fill="none" />
              <path d="M 745 275 L 745 285 L 735 285" fill="none" />
            </g>

            {/* Title Box bound to selectedDrawing */}
            <rect
              x="515"
              y="218"
              width="230"
              height="72"
              fill="var(--color-paper)"
              stroke="var(--color-sheet-sunk)"
              strokeWidth="1"
              rx="4"
            />
            <text x="525" y="235" fill="var(--color-ink-3)" fontSize="9" fontFamily="monospace">
              DOC: {selectedDrawing.dwgNumber}
            </text>
            <text x="525" y="250" fill="var(--color-stamp)" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
              ENG: {selectedDrawing.engineer}
            </text>
            <text x="525" y="265" fill="var(--color-ink-3)" fontSize="9" fontFamily="monospace">
              VIEW: {activeRevision} · {selectedDrawing.department}
            </text>
            <text x="525" y="280" fill="var(--color-ink-3)" fontSize="8" fontFamily="monospace">
              ISO 2768-m / AS9100D
            </text>

            {/* View A */}
            <g transform="translate(170, 150)">
              <line
                x1="-120"
                y1="0"
                x2="120"
                y2="0"
                stroke="var(--color-stamp)"
                strokeWidth="0.8"
                strokeDasharray="8 3 2 3"
                opacity="0.6"
              />
              <line
                x1="0"
                y1="-120"
                x2="0"
                y2="120"
                stroke="var(--color-stamp)"
                strokeWidth="0.8"
                strokeDasharray="8 3 2 3"
                opacity="0.6"
              />
              <circle cx="0" cy="0" r="105" fill="none" stroke="var(--color-rule)" strokeWidth="2.5" />
              <circle
                cx="0"
                cy="0"
                r="82"
                fill="none"
                stroke="var(--color-stamp)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.7"
              />

              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const hx = 82 * Math.cos(rad);
                const hy = 82 * Math.sin(rad);
                return (
                  <circle
                    key={deg}
                    cx={hx}
                    cy={hy}
                    r="6.5"
                    fill="var(--color-paper)"
                    stroke="var(--color-stamp)"
                    strokeWidth="1.5"
                  />
                );
              })}

              <circle
                cx="0"
                cy="0"
                r="40"
                fill={
                  activeRevision === "Rev 3.1"
                    ? "rgba(16, 185, 129, 0.08)"
                    : "rgba(239, 68, 68, 0.12)"
                }
                stroke={activeRevision === "Rev 3.1" ? "var(--color-pass)" : "var(--color-hold)"}
                strokeWidth="2.5"
              />

              {showGdtOverlay && (
                <rect
                  x="-52"
                  y="-52"
                  width="104"
                  height="104"
                  rx="6"
                  fill="none"
                  stroke={activeRevision === "Rev 3.1" ? "var(--color-pass)" : "var(--color-hold)"}
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
              )}

              <text
                x="0"
                y="-112"
                fill="var(--color-ink-3)"
                fontSize="9"
                textAnchor="middle"
                fontFamily="monospace"
              >
                VIEW A: FLANGE ELEVATION (PCD Ø 164)
              </text>
            </g>

            {/* View B */}
            <g transform="translate(380, 150)">
              <line
                x1="-30"
                y1="0"
                x2="110"
                y2="0"
                stroke="var(--color-stamp)"
                strokeWidth="0.8"
                strokeDasharray="8 3 2 3"
                opacity="0.6"
              />
              <path
                d={
                  activeRevision === "Rev 3.1"
                    ? "M 0 -105 L 26 -105 L 26 -40 L 95 -40 L 95 40 L 26 40 L 26 105 L 0 105 Z"
                    : "M 0 -105 L 20 -105 L 20 -40 L 90 -40 L 90 40 L 20 40 L 20 105 L 0 105 Z"
                }
                fill="rgba(56, 189, 248, 0.06)"
                stroke="var(--color-rule)"
                strokeWidth="2"
              />
              <text
                x="45"
                y="125"
                fill="var(--color-ink-3)"
                fontSize="9"
                textAnchor="middle"
                fontFamily="monospace"
              >
                SECTION B-B ({activeRevision})
              </text>
            </g>

            {showGdtOverlay && (
              <g>
                <polyline
                  points="210,135 270,75 490,75"
                  fill="none"
                  stroke={activeRevision === "Rev 3.1" ? "var(--color-pass)" : "var(--color-hold)"}
                  strokeWidth="1.5"
                />
                <circle
                  cx="210"
                  cy="135"
                  r="3"
                  fill={activeRevision === "Rev 3.1" ? "var(--color-pass)" : "var(--color-hold)"}
                />
                <rect
                  x="490"
                  y="35"
                  width="255"
                  height="78"
                  rx="8"
                  fill="var(--color-paper)"
                  stroke={activeRevision === "Rev 3.1" ? "var(--color-pass)" : "var(--color-hold)"}
                  strokeWidth="1.5"
                />
                <text
                  x="502"
                  y="52"
                  fill={activeRevision === "Rev 3.1" ? "var(--color-pass)" : "var(--color-hold)"}
                  fontSize="10"
                  fontWeight="bold"
                >
                  {activeRevision === "Rev 3.1"
                    ? "GD&T COMPENSATED: PASS"
                    : "GD&T DEVIATION: BORE -0.040mm"}
                </text>
                <text x="502" y="68" fill="var(--color-ink-2)" className="text-ink-2 fill-current" fontSize="9" fontFamily="monospace">
                  Nominal: Ø 84.000 H7 (+0.035 / 0.000)
                </text>
                <text
                  x="502"
                  y="82"
                  fill="var(--color-ink-2)"
                  className="text-ink-2 fill-current"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {activeRevision === "Rev 3.1"
                    ? "Measured: Ø 84.015mm (+Offset applied)"
                    : "Measured: Ø 83.960mm (Spindle Drift)"}
                </text>
                <text x="502" y="98" fill="var(--color-ink-3)" fontSize="8">
                  {activeRevision === "Rev 3.1"
                    ? "Ready for WBS-2.1 CNC Cell A"
                    : "Root Cause: Cell A Thermal Drift (+1.8C)"}
                </text>
              </g>
            )}
          </svg>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-rule-strong">
          <div className="text-xs text-ink-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-pass" />
            <span>
              {t("Owner:", "Pemilik:")} <strong className="text-ink">{selectedDrawing.engineer}</strong> (
              {selectedDrawing.department})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleInspectWithAI(
                  selectedDrawing.dwgNumber,
                  `${selectedDrawing.title}, revision ${selectedDrawing.revision}, current status ${selectedDrawing.status}`
                )
              }
              className="px-3 py-1.5 rounded-xl bg-stamp hover:bg-stamp-deep text-sheet text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>{t("Verify in Copilot", "Verifikasi di Copilot")}</span>
            </button>

            <button
              type="button"
              onClick={handleApproveSelectedDrawing}
              disabled={selectedDrawing.status === "Approved"}
              className="px-3 py-1.5 rounded-lg bg-stamp hover:bg-stamp-deep disabled:bg-pass text-sheet text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-default"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {selectedDrawing.status === "Approved"
                  ? t("Gate 3 Approved", "Gerbang 3 Disetujui")
                  : t("Authorize Gate 3 Approval", "Setujui Gerbang 3")}
              </span>
            </button>
          </div>
        </div>
      </div>

      <IRoomTable
        headers={[
          "Drawing Document",
          "Revision",
          "Tooling Engineer",
          "Submitted",
          "Approval Gate",
          "CAD Action",
        ]}
      >
        {drawings
              .filter(
                (d) =>
                  d.dwgNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  d.title.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((dwg) => (
                <tr
                  key={dwg.id}
                  onClick={() => setSelectedDwgId(dwg.id)}
                  className={`transition-colors cursor-pointer ${
                    selectedDrawing.id === dwg.id ? "bg-stamp-wash" : "hover:bg-paper"
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-ink flex items-center gap-1.5">
                      <span>{dwg.dwgNumber}</span>
                      {dwg.criticalDwg && (
                        <span className="px-1.5 py-0.5 bg-hold-wash text-hold font-medium text-xs rounded">
                          {t("Critical")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-3">{dwg.title}</div>
                  </td>
                  <td className="py-3 px-3 font-mono-numbers text-ink font-medium">
                    {dwg.revision}
                  </td>
                  <td className="py-3 px-3 text-ink-2">
                    {dwg.engineer} ({dwg.department})
                  </td>
                  <td className="py-3 px-3 text-ink-3 font-mono-numbers">
                    {dwg.submittedDate}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                        dwg.status === "Approved"
                          ? "bg-pass-wash text-pass border-pass-line"
                          : dwg.status === "Pending Review"
                          ? "bg-warn-wash text-warn border-warn-line"
                          : "bg-hold-wash text-hold border-hold-line"
                      }`}
                    >
                      {t(dwg.status)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDwgId(dwg.id);
                        handleInspectWithAI(
                          dwg.dwgNumber,
                          `${dwg.title}, status ${dwg.status}, engineer ${dwg.engineer}`
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stamp hover:bg-stamp-deep text-sheet rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{t("Inspect with AI", "Periksa dengan AI")}</span>
                    </button>
                  </td>
                </tr>
              ))}
      </IRoomTable>
    </div>
  );
}
