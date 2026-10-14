"use client";

import React, { useState, useEffect } from "react";
import { ProductionLineItem } from "@/types";
import { fetchProductionLines } from "@/lib/api";
import { Layers, Settings, ChevronRight } from "lucide-react";

interface ProductionLineStatusProps {
  onSelectLine?: (line: ProductionLineItem) => void;
}

export const ProductionLineStatus: React.FC<ProductionLineStatusProps> = ({
  onSelectLine
}) => {
  const [lines, setLines] = useState<ProductionLineItem[]>([]);

  useEffect(() => {
    fetchProductionLines().then((data) => {
      if (data) setLines(data);
    });
  }, []);

  const getStatusBadge = (status: ProductionLineItem["status"]) => {
    switch (status) {
      case "On track":
        return "bg-[#e8f8f1] text-[#08784f] border-[#a7f3d0]";
      case "Attention":
        return "bg-[#fff3df] text-[#a35c00] border-[#fed7aa]";
      case "Above target":
        return "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getProgressColor = (status: ProductionLineItem["status"]) => {
    switch (status) {
      case "Attention":
        return "bg-[#f59e0b]";
      case "Above target":
        return "bg-[#06b6d4]";
      default:
        return "bg-[#2563eb]";
    }
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-[0_8px_24px_rgba(19,44,76,0.05)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-[#15243a] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2563eb]" />
            <span>Production Line Status & Work Centers</span>
          </h2>
          <p className="text-xs text-[#64748b]">
            Cross-module shop floor telemetry from IRoom Operation Tracker
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-[#eff6ff] text-[#1d4ed8] rounded-full border border-[#dbeafe]">
          {lines.length} Connected Lines
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Production Line / Cell</th>
              <th className="py-2.5 px-3">Spindle / Line Utilization</th>
              <th className="py-2.5 px-3">Actual vs Target</th>
              <th className="py-2.5 px-3">Telemetry Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {lines.map((line) => (
              <tr key={line.id} className="hover:bg-[#f8fafc] transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#f0f4f9] flex items-center justify-center text-[#2563eb] shrink-0">
                      <Settings className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[#1e293b]">{line.name}</span>
                  </div>
                </td>

                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getProgressColor(line.status)}`}
                        style={{ width: `${line.utilization}%` }}
                      />
                    </div>
                    <span className="font-semibold text-[#334155]">{line.utilization}%</span>
                  </div>
                </td>

                <td className="py-3 px-3 font-mono-numbers text-[#334155]">
                  <strong>{line.outputActual.toLocaleString()}</strong> / {line.outputTarget.toLocaleString()} units
                </td>

                <td className="py-3 px-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(line.status)}`}>
                    {line.status}
                  </span>
                </td>

                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => onSelectLine?.(line)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
