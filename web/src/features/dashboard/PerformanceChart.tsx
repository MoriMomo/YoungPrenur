"use client";

import React, { useState } from "react";
import { useT } from "@/lib/i18n";
import { WbsTask } from "@/types";

interface PerformanceChartProps {
  tasks?: WbsTask[];
  projectName?: string | null;
}

type UploadedChartMetric = "duration" | "risk";

function valueToY(val: number, min: number, max: number): number {
  const ratio = (val - min) / (max - min || 1);
  const clamped = Math.max(0, Math.min(1, ratio));
  return Number((145 - clamped * 120).toFixed(1));
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  tasks = [],
  projectName,
}) => {
  const t = useT();
  const [metric, setMetric] = useState<UploadedChartMetric>("duration");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="bg-sheet border border-rule-strong p-5 sm:p-6">
        <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
          {t("Uploaded Schedule Performance", "Kinerja Jadwal yang Diunggah")}
        </h2>
        <p className="text-xs text-ink-3 mt-1">
          {t("No uploaded WBS tasks available to chart.", "Belum ada tugas WBS yang diunggah untuk digrafikkan.")}
        </p>
      </div>
    );
  }

  const visible = tasks.slice(0, 12);
  const actualSeries =
    metric === "duration"
      ? visible.map((t) => t.actualDays)
      : visible.map((t) => Math.round(t.delayRisk * 100));
  const targetSeries =
    metric === "duration"
      ? visible.map((t) => t.plannedDays)
      : visible.map(() => 25);

  const rawMax =
    metric === "duration"
      ? Math.max(5, ...actualSeries, ...targetSeries)
      : 100;
  const maxVal = metric === "duration" ? Math.ceil(rawMax * 1.15) : 100;
  const minVal = 0;

  const yLabels = [
    String(maxVal),
    String(Math.round(maxVal * 0.67)),
    String(Math.round(maxVal * 0.33)),
    "0",
  ];

  const xForIndex = (idx: number) =>
    visible.length === 1
      ? 315
      : Number((55 + (idx * 510) / (visible.length - 1)).toFixed(1));

  const actualCoords = actualSeries.map((val, idx) => ({
    x: xForIndex(idx),
    y: valueToY(val, minVal, maxVal),
  }));
  const targetCoords = targetSeries.map((val, idx) => ({
    x: xForIndex(idx),
    y: valueToY(val, minVal, maxVal),
  }));

  const actualPoints = actualCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const targetPoints = targetCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const first = actualCoords[0];
  const last = actualCoords[actualCoords.length - 1];
  const areaPoints =
    `M${first.x} ${first.y} ` +
    actualCoords.map((p) => `L${p.x} ${p.y}`).join(" ") +
    ` L${last.x} 145 L${first.x} 145 Z`;

  const hitWidth = Math.max(24, Math.floor(520 / visible.length));

  const getDisplayDetails = (idx: number) => {
    const task = visible[idx];
    const act = actualSeries[idx];
    const tgt = targetSeries[idx];
    const diff = +(act - tgt).toFixed(1);
    if (metric === "duration") {
      return {
        actualFormatted: t(`${act}d forecast`, `prakiraan ${act} h`),
        targetFormatted: t(`${tgt}d planned`, `rencana ${tgt} h`),
        deltaFormatted:
          diff <= 0
            ? diff === 0
              ? t("On plan", "Sesuai rencana")
              : t(`${diff}d ahead`, `${diff} h lebih cepat`)
            : t(`+${diff}d variance`, `selisih +${diff} h`),
        isPositive: diff <= 0,
        status: task.drivers?.[0] ? t(task.drivers[0]) : task.critical ? t("Critical path task", "Tugas jalur kritis") : task.status,
      };
    }
    return {
      actualFormatted: t(`${act}% delay risk`, `risiko terlambat ${act}%`),
      targetFormatted: t(`${tgt}% watch cut-off`, `ambang pantau ${tgt}%`),
      deltaFormatted: act >= tgt ? t(`+${diff}% above cut-off`, `+${diff}% di atas ambang`) : t(`${diff}% below cut-off`, `${diff}% di bawah ambang`),
      isPositive: act < tgt,
      status: task.drivers?.[0] ? t(task.drivers[0]) : task.workCenter || task.status,
    };
  };

  const chartTitle =
    metric === "duration"
      ? t("Uploaded WBS Actual/Forecast vs. Planned Days", "Hari Aktual/Prakiraan vs. Rencana WBS")
      : t("Uploaded WBS Delay Risk (%) vs. Watch Cut-Off", "Risiko Terlambat WBS (%) vs. Ambang Pantau");

  return (
    <div className="bg-sheet border border-rule-strong p-5 sm:p-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
            {chartTitle}
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            {projectName || t("Uploaded schedule", "Jadwal yang diunggah")} ·{" "}
            {t(`showing ${visible.length} of ${tasks.length} WBS tasks`, `menampilkan ${visible.length} dari ${tasks.length} tugas WBS`)}
          </p>
        </div>

        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as UploadedChartMetric)}
          className="h-8 text-xs font-medium px-3 border border-rule bg-white text-ink focus:outline-none focus:ring-2 focus:ring-stamp/20 cursor-pointer self-start sm:self-auto"
          aria-label={t("Select schedule chart metric", "Pilih ukuran grafik jadwal")}
        >
          <option value="duration">{t("Forecast vs. Planned (d)", "Prakiraan vs. Rencana (h)")}</option>
          <option value="risk">{t("Delay Risk (%)", "Risiko Terlambat (%)")}</option>
        </select>
      </div>

      <div className="flex items-center justify-between text-xs text-ink-3 mb-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-stamp" />
            <span className="font-medium text-ink">
              {metric === "duration" ? t("Actual / Forecast", "Aktual / Prakiraan") : t("Delay Risk", "Risiko Terlambat")}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ink-3" />
            <span>{metric === "duration" ? t("Planned", "Rencana") : t("Watch Threshold (25%)", "Ambang Pantau (25%)")}</span>
          </span>
        </div>
        <span className="text-xs font-mono-numbers text-ink-3">
          {metric === "duration" ? t("Days", "Hari") : t("% Probability", "% Peluang")}
        </span>
      </div>

      <div
        className="relative w-full overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          className="w-full h-44 sm:h-48 block cursor-crosshair overflow-visible"
          viewBox="0 0 600 170"
          preserveAspectRatio="none"
          role="img"
          aria-label={chartTitle}
        >
          <g stroke="var(--color-rule-soft)" strokeWidth="1">
            <line x1="42" y1="25" x2="585" y2="25" />
            <line x1="42" y1="65" x2="585" y2="65" />
            <line x1="42" y1="105" x2="585" y2="105" />
            <line x1="42" y1="145" x2="585" y2="145" />
          </g>

          <g fill="var(--color-ink-3)" fontSize="11" className="font-mono-numbers">
            <text x="0" y="28">{yLabels[0]}</text>
            <text x="0" y="68">{yLabels[1]}</text>
            <text x="0" y="108">{yLabels[2]}</text>
            <text x="0" y="148">{yLabels[3]}</text>
          </g>

          {visible.length > 1 && (
            <>
              <path d={areaPoints} fill="var(--color-stamp-wash)" opacity="0.4" />
              <polyline
                points={targetPoints}
                fill="none"
                stroke="var(--color-ink-3)"
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
              <polyline
                points={actualPoints}
                fill="none"
                stroke="var(--color-stamp)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {hoverIndex !== null && actualCoords[hoverIndex] && (
            <g>
              <line
                x1={actualCoords[hoverIndex].x}
                y1={20}
                x2={actualCoords[hoverIndex].x}
                y2={145}
                stroke="var(--color-stamp)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <circle
                cx={targetCoords[hoverIndex].x}
                cy={targetCoords[hoverIndex].y}
                r="4"
                fill="var(--color-ink-3)"
                stroke="var(--color-sheet)"
                strokeWidth="1.5"
              />
              <circle
                cx={actualCoords[hoverIndex].x}
                cy={actualCoords[hoverIndex].y}
                r="5.5"
                fill="var(--color-sheet)"
                stroke="var(--color-stamp)"
                strokeWidth="2.5"
              />
            </g>
          )}

          <g fill="var(--color-stamp)">
            {actualCoords.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === idx ? "5.5" : "3.5"}
              />
            ))}
          </g>

          {actualCoords.map((pt, idx) => (
            <rect
              key={idx}
              x={pt.x - hitWidth / 2}
              y={0}
              width={hitWidth}
              height={160}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseMove={() => setHoverIndex(idx)}
            />
          ))}
        </svg>

        {hoverIndex !== null && visible[hoverIndex] && (() => {
          const details = getDisplayDetails(hoverIndex);
          const xPct = (actualCoords[hoverIndex].x / 600) * 100;
          return (
            <div
              className="absolute -top-2 z-30 pointer-events-none"
              style={{
                left: `${Math.max(15, Math.min(85, xPct))}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="bg-ink text-white p-3 rounded-xl shadow-sm border border-white/12 text-xs w-56">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 mb-2">
                  <span className="font-medium text-white text-xs truncate">
                    {visible[hoverIndex].code}
                  </span>
                  <span
                    className={`font-mono-numbers text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                      details.isPositive
                        ? "bg-pass/30 text-pass-line"
                        : "bg-hold/30 text-hold-line"
                    }`}
                  >
                    {details.deltaFormatted}
                  </span>
                </div>
                <p className="text-rule mb-1.5 truncate">{visible[hoverIndex].task}</p>
                <div className="space-y-1 font-mono-numbers text-xs">
                  <div className="flex items-center justify-between text-sheet">
                    <span className="text-rule">{metric === "duration" ? t("Forecast:", "Prakiraan:") : t("Risk:", "Risiko:")}</span>
                    <span className="font-medium text-white">{details.actualFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-sheet">
                    <span className="text-rule">{metric === "duration" ? t("Planned:", "Rencana:") : t("Cut-off:", "Ambang:")}</span>
                    <span>{details.targetFormatted}</span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/10 text-xs text-stamp-line truncate">
                  {details.status}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex justify-between text-[11px] font-mono-numbers text-ink-3 mt-1 px-4 gap-1 overflow-hidden">
          {visible.map((t, idx) => (
            <button
              key={t.code}
              type="button"
              onMouseEnter={() => setHoverIndex(idx)}
              onFocus={() => setHoverIndex(idx)}
              className={`cursor-pointer py-1.5 truncate transition-colors ${
                hoverIndex === idx ? "text-stamp font-medium" : ""
              }`}
            >
              {t.code}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
