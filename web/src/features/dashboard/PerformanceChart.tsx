"use client";

import React, { useState, useEffect } from "react";
import { PerformanceMetricKey } from "@/types";
import { fetchPerformanceData } from "@/lib/api";
import { TrendingUp } from "lucide-react";

export const PerformanceChart: React.FC = () => {
  const [metric, setMetric] = useState<PerformanceMetricKey>("output");
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

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Compute SVG Points based on 600x190 viewBox
  const actualPoints = chartData.actual
    .map((val, idx) => `${55 + idx * 82},${val + 82}`)
    .join(" ");

  const targetPoints = chartData.target
    .map((val, idx) => `${55 + idx * 82},${val + 82}`)
    .join(" ");

  const areaPoints = `M55 ${chartData.actual[0] + 82} ` +
    chartData.actual.map((val, idx) => `L${55 + idx * 82} ${val + 82}`).join(" ") +
    ` L547 165 L55 165 Z`;

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-[0_8px_24px_rgba(19,44,76,0.05)]">
      {/* Title & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-[#15243a] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2563eb]" />
            <span>Operational Performance Telemetry</span>
          </h2>
          <p className="text-xs text-[#64748b]">
            Daily trend vs. scheduled baseline · Last 7 production days
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as PerformanceMetricKey)}
            className="text-xs font-semibold px-3 py-1.5 border border-[#cbd5e1] rounded-lg bg-white text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
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

      {/* Dynamic SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          className="w-full h-44 sm:h-48 block"
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

          {/* Data Points */}
          <g fill="#2563eb">
            {chartData.actual.map((val, idx) => (
              <circle
                key={idx}
                cx={55 + idx * 82}
                cy={val + 82}
                r="4.5"
                className="hover:scale-125 transition-transform"
              />
            ))}
          </g>
        </svg>

        {/* X Axis Day Labels */}
        <div className="flex justify-between text-[11px] font-medium text-[#64748b] mt-2 px-6">
          {days.map((day, idx) => (
            <span key={idx}>{day}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
