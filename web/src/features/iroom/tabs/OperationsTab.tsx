"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { OperationTrackerItem } from "@/types";
import { IRoomTable } from "../IRoomTable";

export interface OperationsTabProps {
  searchQuery: string;
  handleInspectWithAI: (entityName: string, detail: string) => void;
  operations: OperationTrackerItem[];
}

export function OperationsTab({ searchQuery, handleInspectWithAI, operations }: OperationsTabProps) {
  return (
    <IRoomTable
      headers={[
        "Work Center & Machine",
        "Operator & Shift",
        "OEE & Spindle Load",
        "Vibration Sensor",
        "Active Job",
        "Copilot Action",
      ]}
    >
      {operations
            .filter(
              (op) =>
                op.workCenter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                op.machineId.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((op) => (
              <tr key={op.id} className="hover:bg-[#f8fafc] transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-[#111827]">{op.workCenter}</div>
                  <div className="text-[11px] font-mono-numbers text-[#64748b]">
                    {op.machineId}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-medium text-[#111827]">{op.operator}</div>
                  <div className="text-[11px] text-[#64748b]">{op.shift}</div>
                </td>
                <td className="py-3 px-3 font-mono-numbers">
                  <div className="font-medium text-[#111827]">OEE: {op.oeePercent}%</div>
                  <div className="text-[11px] text-[#2563eb]">
                    Spindle: {op.spindleUtilization}%
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border font-mono-numbers ${
                      op.vibrationSensor === "ELEVATED"
                        ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                        : "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                    }`}
                  >
                    {op.vibrationSensor}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono-numbers text-[#334155] font-medium">
                  {op.activeJob}
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      handleInspectWithAI(
                        op.machineId,
                        `Work center ${op.workCenter}, OEE ${op.oeePercent}%, Vibration ${op.vibrationSensor}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-[#60a5fa]" />
                    <span>Sensor RCA</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
