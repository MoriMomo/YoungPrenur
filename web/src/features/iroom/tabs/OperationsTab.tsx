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
              <tr key={op.id} className="hover:bg-paper transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-ink">{op.workCenter}</div>
                  <div className="text-xs font-mono-numbers text-ink-3">
                    {op.machineId}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="font-medium text-ink">{op.operator}</div>
                  <div className="text-xs text-ink-3">{op.shift}</div>
                </td>
                <td className="py-3 px-3 font-mono-numbers">
                  <div className="font-medium text-ink">OEE: {op.oeePercent}%</div>
                  <div className="text-xs text-stamp">
                    Spindle: {op.spindleUtilization}%
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium border font-mono-numbers ${
                      op.vibrationSensor === "ELEVATED"
                        ? "bg-hold-wash text-hold border-hold-line"
                        : "bg-pass-wash text-pass border-pass-line"
                    }`}
                  >
                    {op.vibrationSensor}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono-numbers text-ink-2 font-medium">
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stamp hover:bg-stamp-deep text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-stamp" />
                    <span>Sensor RCA</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
