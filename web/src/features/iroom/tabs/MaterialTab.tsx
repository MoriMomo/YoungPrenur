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
              <tr key={mat.id} className="hover:bg-paper transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-ink">{mat.partNumber}</div>
                  <div className="text-xs text-ink-3 truncate max-w-xs">
                    {mat.description}
                  </div>
                </td>
                <td className="py-3 px-3 text-ink-2 font-medium">{mat.supplier}</td>
                <td className="py-3 px-3">
                  <div className="font-medium text-ink">{mat.eta}</div>
                  <div className="text-xs text-hold font-mono-numbers font-medium">
                    {mat.stockCoverHours}h stock cover left
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                      mat.status === "Critical"
                        ? "bg-hold-wash text-hold border-hold-line"
                        : mat.status === "At Risk"
                        ? "bg-warn-wash text-warn border-warn-line"
                        : "bg-pass-wash text-pass border-pass-line"
                    }`}
                  >
                    {mat.status} ({(mat.riskScore * 100).toFixed(0)}%)
                  </span>
                </td>
                <td className="py-3 px-3 font-mono-numbers text-stamp font-semibold">
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-stamp hover:bg-stamp-deep text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-stamp" />
                    <span>Mitigate</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
