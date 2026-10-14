"use client";

import React, { useState, useEffect } from "react";
import { PerformanceMetricKey } from "@/types";
import { fetchPerformanceData } from "@/lib/api";
import { TrendingUp, Sparkles, Activity } from "lucide-react";

export const PerformanceChart: React.FC = () => {
  const [metric, setMetric] = useState<PerformanceMetricKey>("output");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [chartData, setChartData] = useState({
    actual: [62, 55, 71, 45, 51, 38, 43],
    target: [50, 50, 50, 50, 50, 50, 50],
    labels: ["1.2k", "900", "600", "300"],
    unit: "Units Produced"
  });

  useEffect(() => {
    fetchPerformanceData(metric).then((data) => {
      if (data) setChartData(data);
    });
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

  // Real-world value mapper for tooltips
  const getDisplayDetails = (idx: number) => {
    const act = chartData.actual[idx];
    const tgt = chartData.target[idx];

    if (metric === "output") {
      const actualVal = Math.round(act * 16.5);
      const targetVal = Math.round(tgt * 20);
      const deltaPct = +(((actualVal - targetVal) / targetVal) * 100).toFixed(1);
      return {
        actualFormatted: `${actualVal.toLocaleString()} units`,
        targetFormatted: `${targetVal.toLocaleString()} units`,
        deltaFormatted: `${deltaPct > 0 ? "+" : ""}${deltaPct}%`,
        isPositive: deltaPct >= 0,
        status: deltaPct >= 0 ? "Above Scheduled Target" : "Output Deficit (-WBS Lag)",
      };
    } else if (metric === "oee") {
      const actualVal = +(act * 1.15).toFixed(1);
      const targetVal = +(tgt * 1.5).toFixed(1);
      const deltaPct = +(actualVal - targetVal).toFixed(1);
      return {
        actualFormatted: `${actualVal}% OEE`,
        targetFormatted: `${targetVal}% OEE`,
        deltaFormatted: `${deltaPct > 0 ? "+" : ""}${deltaPct}%`,
        isPositive: deltaPct >= 0,
        status: deltaPct >= 0 ? "Optimal Spindle Efficiency" : "Micro-stoppages Logged",
      };
    } else {
      const actualVal = +(act * 0.08).toFixed(1);
      const targetVal = +(tgt * 0.04).toFixed(1);
      const isGood = actualVal <= targetVal;
      return {
        actualFormatted: `${actualVal} hrs`,
        targetFormatted: `${targetVal} hrs allowed`,
        deltaFormatted: isGood ? "Within Tolerance" : "+High Unplanned Downtime",
        isPositive: isGood,
        status: isGood ? "Nominal Mechanical Health" : "Hydraulic/Tooling Constraint",
      };
    }
  };

  // Compute SVG Points based on 600x190 viewBox
  const actualPoints = chartData.actual
    .map((val, idx) => `${55 + idx * 82},${val + 82}`)
    .join(" ");

  const targetPoints = chartData.target
    .map((val, idx) => `${55 + idx * 82},${val + 82}`)
    .join(" ");

  const areaPoints =
    `M55 ${chartData.actual[0] + 82} ` +
    chartData.actual.map((val, idx) => `L${55 + idx * 82} ${val + 82}`).join(" ") +
    ` L547 165 L55 165 Z`;

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-[0_8px_24px_rgba(19,44,76,0.05)] relative">
      {/* Title & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-[#15243a] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#2563eb]" />
              <span>Operational Performance Telemetry</span>
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe]">
              <Activity className="w-3 h-3 text-[#2563eb] animate-pulse" />
              <span>Interactive Scrubbing</span>
            </span>
          </div>
          <p className="text-xs text-[#64748b]">
            Daily trend vs. scheduled baseline · Hover over any point to scrub telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as PerformanceMetricKey)}
            className="text-xs font-semibold px-3 py-1.5 border border-[#cbd5e1] rounded-lg bg-white text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
            aria-label="Select performance metric"
          >
            <option value="output">Units produced</option>
            <option value="oee">OEE (%)</option>
            <option value="downtime">Downtime (hrs)</option>
          </select>
        </div>
      </div>

      {/* Legend & Unit */}
      <div className="flex items-center justify-between text-xs text-[#64748b] mb-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
            <strong className="text-[#1e293b]">Actual Telemetry</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#93c5fd]" />
            <span>Target / Planned</span>
          </span>
        </div>
        <span className="text-[11px] font-medium bg-[#f1f5f9] px-2 py-0.5 rounded text-[#475569]">
          {chartData.unit}
        </span>
      </div>

      {/* Dynamic SVG Chart with Crosshair & Hit-Testing */}
      <div
        className="relative w-full overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          className="w-full h-44 sm:h-48 block cursor-crosshair overflow-visible"
          viewBox="0 0 600 190"
          preserveAspectRatio="none"
          role="img"
          aria-label="Performance Trend Chart"
        >
          {/* Horizontal Gridlines */}
          <g stroke="#f1f5f9" strokeWidth="1">
            <line x1="38" y1="25" x2="590" y2="25" />
            <line x1="38" y1="65" x2="590" y2="65" />
            <line x1="38" y1="105" x2="590" y2="105" />
            <line x1="38" y1="145" x2="590" y2="145" />
          </g>

          {/* Y Axis Labels */}
          <g fill="#94a3b8" fontSize="10">
            <text x="0" y="28">{chartData.labels[0]}</text>
            <text x="0" y="68">{chartData.labels[1]}</text>
            <text x="0" y="108">{chartData.labels[2]}</text>
            <text x="0" y="148">{chartData.labels[3]}</text>
          </g>

          {/* Shaded Area Under Curve */}
          <path d={areaPoints} fill="#dbeafe" opacity="0.65" />

          {/* Target Dashed Line */}
          <polyline
            points={targetPoints}
            fill="none"
            stroke="#93c5fd"
            strokeWidth="2"
            strokeDasharray="5 5"
          />

          {/* Actual Polyline */}
          <polyline
            points={actualPoints}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair Line on Active Hover */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={55 + hoverIndex * 82}
                y1={18}
                x2={55 + hoverIndex * 82}
                y2={165}
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.85"
              />
              {/* Highlight Target Point */}
              <circle
                cx={55 + hoverIndex * 82}
                cy={chartData.target[hoverIndex] + 82}
                r="4.5"
                fill="#93c5fd"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Pulsing Highlight on Actual Point */}
              <circle
                cx={55 + hoverIndex * 82}
                cy={chartData.actual[hoverIndex] + 82}
                r="10"
                fill="#2563eb"
                fillOpacity="0.25"
              />
              <circle
                cx={55 + hoverIndex * 82}
                cy={chartData.actual[hoverIndex] + 82}
                r="6"
                fill="#ffffff"
                stroke="#2563eb"
                strokeWidth="3"
              />
            </g>
          )}

          {/* Data Points */}
          <g fill="#2563eb">
            {chartData.actual.map((val, idx) => (
              <circle
                key={idx}
                cx={55 + idx * 82}
                cy={val + 82}
                r={hoverIndex === idx ? "6" : "4"}
                className="transition-all duration-150"
              />
            ))}
          </g>

          {/* Invisible Hit Columns for Scrubbing */}
          {days.map((_, idx) => (
            <rect
              key={idx}
              x={55 + idx * 82 - 41}
              y={0}
              width={82}
              height={180}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseMove={() => setHoverIndex(idx)}
            />
          ))}
        </svg>

        {/* Floating HUD Tooltip Card */}
        {hoverIndex !== null && (() => {
          const details = getDisplayDetails(hoverIndex);
          const xPct = ((55 + hoverIndex * 82) / 600) * 100;
          return (
            <div
              className="absolute -top-3 z-30 pointer-events-none transition-all duration-100 ease-out"
              style={{
                left: `${Math.max(12, Math.min(88, xPct))}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="bg-[#0c1a2d] text-white p-3 rounded-xl shadow-2xl border border-[#234268] text-xs w-48 sm:w-56 backdrop-blur-md">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1e3450] mb-2">
                  <span className="font-bold text-white text-[11px]">
                    {days[hoverIndex].full}
                  </span>
                  <span
                    className={`font-mono-numbers text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                      details.isPositive
                        ? "bg-[#059669]/30 text-[#34d399] border border-[#059669]/50"
                        : "bg-[#dc2626]/30 text-[#f87171] border border-[#dc2626]/50"
                    }`}
                  >
                    {details.deltaFormatted}
                  </span>
                </div>

                <div className="space-y-1 font-mono-numbers text-[11px]">
                  <div className="flex items-center justify-between text-[#cad8e8]">
                    <span className="text-[#94a3b8]">Actual:</span>
                    <strong className="text-white text-xs">{details.actualFormatted}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#cad8e8]">
                    <span className="text-[#94a3b8]">Target:</span>
                    <span>{details.targetFormatted}</span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-[#1e3450] text-[10px] text-[#93c5fd] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                  <span className="truncate">{details.status}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* X Axis Day Labels */}
        <div className="flex justify-between text-[11px] font-medium text-[#64748b] mt-2 px-6">
          {days.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onMouseEnter={() => setHoverIndex(idx)}
              className={`transition-colors cursor-pointer ${
                hoverIndex === idx ? "text-[#2563eb] font-bold underline" : ""
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
