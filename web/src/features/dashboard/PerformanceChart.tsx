"use client";

import React, { useState, useEffect } from "react";
import { PerformanceMetricKey } from "@/types";
import { fetchPerformanceData } from "@/lib/api";
import { PERFORMANCE_CHART_DATA } from "@/lib/mock-data";

interface ChartSeriesData {
  actual: number[];
  target: number[];
  labels: string[];
  min: number;
  max: number;
  unit: string;
}

const DEFAULT_BOUNDS: Record<PerformanceMetricKey, { min: number; max: number }> = {
  output: { min: 300, max: 1200 },
  oee: { min: 40, max: 100 },
  downtime: { min: 1.5, max: 6.0 },
};

function valueToY(val: number, min: number, max: number): number {
  const ratio = (val - min) / (max - min || 1);
  const clamped = Math.max(0, Math.min(1, ratio));
  return Number((145 - clamped * 120).toFixed(1));
}

export const PerformanceChart: React.FC = () => {
  const [metric, setMetric] = useState<PerformanceMetricKey>("output");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartSeriesData>(PERFORMANCE_CHART_DATA.output);

  useEffect(() => {
    let active = true;
    fetchPerformanceData(metric).then((data) => {
      if (!active || !data) return;
      const bounds = DEFAULT_BOUNDS[metric];
      setChartData({
        actual: data.actual,
        target: data.target,
        labels: data.labels,
        min: typeof data.min === "number" ? data.min : bounds.min,
        max: typeof data.max === "number" ? data.max : bounds.max,
        unit: data.unit,
      });
    });
    return () => {
      active = false;
    };
  }, [metric]);

  const days = [
    { short: "Mon", full: "Monday (Day 1)" },
    { short: "Tue", full: "Tuesday (Day 2)" },
    { short: "Wed", full: "Wednesday (Day 3)" },
    { short: "Thu", full: "Thursday (Day 4)" },
    { short: "Fri", full: "Friday (Day 5)" },
    { short: "Sat", full: "Saturday (Day 6)" },
    { short: "Sun", full: "Sunday (Day 7)" },
  ];

  const getDisplayDetails = (idx: number) => {
    const act = chartData.actual[idx];
    const tgt = chartData.target[idx];

    if (metric === "output") {
      const deltaPct = +(((act - tgt) / tgt) * 100).toFixed(1);
      return {
        actualFormatted: `${act.toLocaleString("en-US")} units`,
        targetFormatted: `${tgt.toLocaleString("en-US")} units`,
        deltaFormatted: `${deltaPct > 0 ? "+" : ""}${deltaPct}%`,
        isPositive: deltaPct >= 0,
        status: deltaPct >= 0 ? "Above Scheduled Target" : "Output Deficit (WBS Lag)",
      };
    }

    if (metric === "oee") {
      const deltaPct = +(act - tgt).toFixed(1);
      return {
        actualFormatted: `${act}% OEE`,
        targetFormatted: `${tgt}% OEE`,
        deltaFormatted: `${deltaPct > 0 ? "+" : ""}${deltaPct}%`,
        isPositive: deltaPct >= 0,
        status: deltaPct >= 0 ? "Optimal Spindle Efficiency" : "Micro-stoppages Logged",
      };
    }

    const isGood = act <= tgt;
    const diff = +(act - tgt).toFixed(1);
    return {
      actualFormatted: `${act} hrs`,
      targetFormatted: `${tgt} hrs max`,
      deltaFormatted: isGood ? "Within Tolerance" : `+${diff}h Excess`,
      isPositive: isGood,
      status: isGood ? "Nominal Mechanical Health" : "Hydraulic / Tooling Constraint",
    };
  };

  const bounds = DEFAULT_BOUNDS[metric];
  const minVal = chartData.min ?? bounds.min;
  const maxVal = chartData.max ?? bounds.max;

  const actualCoords = chartData.actual.map((val, idx) => ({
    x: 55 + idx * 82,
    y: valueToY(val, minVal, maxVal),
  }));

  const targetCoords = chartData.target.map((val, idx) => ({
    x: 55 + idx * 82,
    y: valueToY(val, minVal, maxVal),
  }));

  const actualPoints = actualCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const targetPoints = targetCoords.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints =
    `M${actualCoords[0].x} ${actualCoords[0].y} ` +
    actualCoords.map((p) => `L${p.x} ${p.y}`).join(" ") +
    ` L547 145 L55 145 Z`;

  const chartQuestion =
    metric === "output"
      ? "Daily Shop-Floor Output vs. Scheduled Target (Last 7 Days)"
      : metric === "oee"
      ? "Daily OEE % vs. 85% Baseline Target (Last 7 Days)"
      : "Daily Unplanned Downtime vs. 2.5h Tolerance (Last 7 Days)";

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] relative">
      {/* Title & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-medium text-[#111827]">
            {chartQuestion}
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Simulated 7-day baseline telemetry · Hover across days to inspect variance
          </p>
        </div>

        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as PerformanceMetricKey)}
          className="h-8 text-xs font-medium px-3 border border-[#e5e7eb] rounded-lg bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 cursor-pointer self-start sm:self-auto"
          aria-label="Select performance metric"
        >
          <option value="output">Units produced</option>
          <option value="oee">OEE (%)</option>
          <option value="downtime">Downtime (hrs)</option>
        </select>
      </div>

      {/* Legend & Unit */}
      <div className="flex items-center justify-between text-xs text-[#64748b] mb-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
            <span className="font-medium text-[#111827]">Actual</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
            <span>Target</span>
          </span>
        </div>
        <span className="text-xs font-mono-numbers text-[#64748b]">
          {chartData.unit}
        </span>
      </div>

      {/* SVG Chart */}
      <div
        className="relative w-full overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          className="w-full h-44 sm:h-48 block cursor-crosshair overflow-visible"
          viewBox="0 0 600 170"
          preserveAspectRatio="none"
          role="img"
          aria-label={chartQuestion}
        >
          {/* Horizontal Gridlines */}
          <g stroke="#f1f5f9" strokeWidth="1">
            <line x1="42" y1="25" x2="585" y2="25" />
            <line x1="42" y1="65" x2="585" y2="65" />
            <line x1="42" y1="105" x2="585" y2="105" />
            <line x1="42" y1="145" x2="585" y2="145" />
          </g>

          {/* Y Axis Labels */}
          <g fill="#64748b" fontSize="10" className="font-mono-numbers">
            <text x="0" y="28">{chartData.labels[0]}</text>
            <text x="0" y="68">{chartData.labels[1]}</text>
            <text x="0" y="108">{chartData.labels[2]}</text>
            <text x="0" y="148">{chartData.labels[3]}</text>
          </g>

          {/* Area Under Actual Curve */}
          <path d={areaPoints} fill="#dbeafe" opacity="0.4" />

          {/* Target Dashed Line */}
          <polyline
            points={targetPoints}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="5 5"
          />

          {/* Actual Polyline */}
          <polyline
            points={actualPoints}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair on Active Hover */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={actualCoords[hoverIndex].x}
                y1={20}
                x2={actualCoords[hoverIndex].x}
                y2={145}
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <circle
                cx={targetCoords[hoverIndex].x}
                cy={targetCoords[hoverIndex].y}
                r="4"
                fill="#94a3b8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <circle
                cx={actualCoords[hoverIndex].x}
                cy={actualCoords[hoverIndex].y}
                r="5.5"
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Data Points */}
          <g fill="#2563eb">
            {actualCoords.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={hoverIndex === idx ? "5.5" : "3.5"}
              />
            ))}
          </g>

          {/* Hit Columns */}
          {days.map((_, idx) => (
            <rect
              key={idx}
              x={55 + idx * 82 - 41}
              y={0}
              width={82}
              height={160}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseMove={() => setHoverIndex(idx)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoverIndex !== null && (() => {
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
              <div className="bg-[#0d131c] text-white p-3 rounded-xl shadow-sm border border-white/12 text-xs w-52">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                  <span className="font-medium text-white text-[11px]">
                    {days[hoverIndex].full}
                  </span>
                  <span
                    className={`font-mono-numbers text-[11px] font-medium px-1.5 py-0.5 rounded ${
                      details.isPositive
                        ? "bg-[#059669]/30 text-[#34d399]"
                        : "bg-[#dc2626]/30 text-[#f87171]"
                    }`}
                  >
                    {details.deltaFormatted}
                  </span>
                </div>

                <div className="space-y-1 font-mono-numbers text-[11px]">
                  <div className="flex items-center justify-between text-[#eef0f5]">
                    <span className="text-[#8f98ab]">Actual:</span>
                    <span className="font-medium text-white">{details.actualFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#eef0f5]">
                    <span className="text-[#8f98ab]">Target:</span>
                    <span>{details.targetFormatted}</span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/10 text-[11px] text-[#93c5fd]">
                  {details.status}
                </div>
              </div>
            </div>
          );
        })()}

        {/* X Axis Labels */}
        <div className="flex justify-between text-[11px] font-medium text-[#64748b] mt-1 px-6">
          {days.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onMouseEnter={() => setHoverIndex(idx)}
              onFocus={() => setHoverIndex(idx)}
              className={`cursor-pointer transition-colors ${
                hoverIndex === idx ? "text-[#2563eb] font-medium" : ""
              }`}
            >
              {day.short}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
