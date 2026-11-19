"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { MaterialDeliveryItem } from "@/types";
import { IRoomTable } from "../IRoomTable";

export interface MaterialTabProps {
  searchQuery: string;
  handleInspectWithAI: (entityName: string, detail: string) => void;
  materials: MaterialDeliveryItem[];
}

export function MaterialTab({ searchQuery, handleInspectWithAI, materials }: MaterialTabProps) {
  return (
    <IRoomTable
      headers={[
        "Part Number & Material",
        "Supplier",
        "ETA & Cover Window",
        "Risk Score",
        "Purchase Order",
        "Copilot Action",
      ]}
    >
      {materials
            .filter(
              (m) =>
                m.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.supplier.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((mat) => (
              <tr key={mat.id} className="hover:bg-[#f8fafc] transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-[#111827]">{mat.partNumber}</div>
                  <div className="text-[11px] text-[#64748b] truncate max-w-xs">
                    {mat.description}
                  </div>
                </td>
                <td className="py-3 px-3 text-[#374151] font-medium">{mat.supplier}</td>
                <td className="py-3 px-3">
                  <div className="font-medium text-[#111827]">{mat.eta}</div>
                  <div className="text-[11px] text-[#dc2626] font-mono-numbers font-medium">
                    {mat.stockCoverHours}h stock cover left
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                      mat.status === "Critical"
                        ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                        : mat.status === "At Risk"
                        ? "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                        : "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                    }`}
                  >
                    {mat.status} ({(mat.riskScore * 100).toFixed(0)}%)
                  </span>
                </td>
                <td className="py-3 px-3 font-mono-numbers text-[#2563eb] font-semibold">
                  {mat.openPo}
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      handleInspectWithAI(
                        mat.partNumber,
                        `Stock cover ${mat.stockCoverHours}h vs Lead time ${mat.supplierLeadDays}d, PO ${mat.openPo}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-[#60a5fa]" />
                    <span>Mitigate</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
