"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { QuotationPoItem } from "@/types";
import { IRoomTable } from "../IRoomTable";

export interface QuotationTabProps {
  searchQuery: string;
  handleInspectWithAI: (entityName: string, detail: string) => void;
  quotations: QuotationPoItem[];
}

export function QuotationTab({ searchQuery, handleInspectWithAI, quotations }: QuotationTabProps) {
  return (
    <IRoomTable
      headers={[
        "PO Number & QTN Ref",
        "Vendor Name",
        "Total Value (IDR)",
        "Payment Term",
        "Status",
        "Copilot Action",
      ]}
    >
      {quotations
            .filter(
              (q) =>
                q.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                q.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((po) => (
              <tr key={po.id} className="hover:bg-[#f8fafc] transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-[#111827] flex items-center gap-1.5">
                    <span className="font-mono-numbers">{po.poNumber}</span>
                    {po.expedited && (
                      <span className="px-1.5 py-0.5 bg-[#fffbeb] text-[#b45309] font-medium text-[10px] rounded">
                        Expedite
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#64748b] font-mono-numbers">
                    Ref: {po.quotationRef}
                  </div>
                </td>
                <td className="py-3 px-3 text-[#374151] font-medium">{po.vendorName}</td>
                <td className="py-3 px-3 font-mono-numbers text-[#111827] font-medium">
                  {po.totalValueIdr}
                </td>
                <td className="py-3 px-3 text-[#64748b]">{po.paymentTerm}</td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                      po.status === "PO Issued"
                        ? "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                        : "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                    }`}
                  >
                    {po.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      handleInspectWithAI(
                        po.poNumber,
                        `Vendor ${po.vendorName}, value ${po.totalValueIdr}, term ${po.paymentTerm}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-[#60a5fa]" />
                    <span>Assess PO</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
