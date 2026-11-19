"use client";

import React, { useState, useRef } from "react";
import { FileSpreadsheet, Upload, Loader2, FileCheck, FileDown, MessageSquare } from "lucide-react";
import { ScheduleUploadError, uploadScheduleFile } from "@/lib/api";
import { WbsTask } from "@/types";

const CSV_TEMPLATE_HEADER =
  "WBS_Code,Activity_Name,Planned_Duration_Days,Actual_Forecast_Days,Critical_Path,Delay_Risk,Assigned_Work_Center,Owner,Predecessors,Status\n";

const HEADER_ALIASES = {
  code: ["wbscode", "wbs", "code", "taskid", "id", "activityid", "kodewbs"],
  task: ["activityname", "activity", "taskname", "task", "name", "description", "aktivitas", "namaaktivitas"],
  planned: ["planneddurationdays", "plannedduration", "planneddays", "planned", "durationdays", "duration", "durasi", "durasirencana"],
  actual: ["actualforecastdays", "forecastdays", "actualdays", "actualduration", "forecastduration", "forecast", "actual", "durasiaktual"],
  critical: ["criticalpath", "critical", "iscritical", "jalurkritis"],
  risk: ["delayrisk", "risk", "riskscore"],
  workCenter: ["assignedworkcenter", "workcenter", "workcentre", "resource", "machine", "stasiunkerja"],
  owner: ["owner", "pic", "assignee", "responsible", "penanggungjawab"],
  status: ["status"],
} as const;

interface ScheduleUploadResult {
  tasks?: WbsTask[];
  tasks_extracted?: number;
  source?: string;
  filename?: string;
  extraction_method?: string;
  document_summary?: string | null;
  ai_parsed?: boolean;
}

interface ScheduleUploaderProps {
  activeFilename?: string | null;
  activeTaskCount?: number;
  activeExtractionMethod?: string | null;
  activeDocumentSummary?: string | null;
  onUploadComplete?: (data: ScheduleUploadResult) => void;
  onAskCopilot?: (query: string) => void;
  onToast?: (message: string) => void;
}

function splitCsvRow(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Parses an uploaded CSV into WBS tasks using recognized column headers when offline. */
function parseCsvToWbs(csvText: string): WbsTask[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const sep = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const normHeaders = splitCsvRow(lines[0], sep).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const colIdx = {
    code: findHeaderIndex(normHeaders, HEADER_ALIASES.code),
    task: findHeaderIndex(normHeaders, HEADER_ALIASES.task),
    planned: findHeaderIndex(normHeaders, HEADER_ALIASES.planned),
    actual: findHeaderIndex(normHeaders, HEADER_ALIASES.actual),
    critical: findHeaderIndex(normHeaders, HEADER_ALIASES.critical),
    risk: findHeaderIndex(normHeaders, HEADER_ALIASES.risk),
    workCenter: findHeaderIndex(normHeaders, HEADER_ALIASES.workCenter),
    owner: findHeaderIndex(normHeaders, HEADER_ALIASES.owner),
    status: findHeaderIndex(normHeaders, HEADER_ALIASES.status),
  };

  if (colIdx.task === -1 || colIdx.planned === -1) return [];

  let cursor = 0;
  const tasks: WbsTask[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i], sep);
    const cell = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].trim() : "");

    const taskName = cell(colIdx.task);
    const rawPlanned = parseFloat(cell(colIdx.planned).replace(",", "."));
    if (!taskName || !Number.isFinite(rawPlanned) || rawPlanned <= 0) continue;

    const planned = rawPlanned;
    const rawActual = parseFloat(cell(colIdx.actual).replace(",", "."));
    const actual = Number.isFinite(rawActual) && rawActual > 0 ? rawActual : planned;
    const critical = /^(true|yes|y|1|ya|x)$/i.test(cell(colIdx.critical));
    const rawRisk = parseFloat(cell(colIdx.risk).replace(",", ".").replace("%", ""));
    const delayRisk = Number.isFinite(rawRisk)
      ? Math.min(0.99, Math.max(0, rawRisk > 1 ? rawRisk / 100 : rawRisk))
      : 0;

    const varianceDays = Math.max(0, Math.round((actual - planned) * 100) / 100);
    const workCenter = cell(colIdx.workCenter) || undefined;
    const owner = cell(colIdx.owner) || undefined;
    const code = cell(colIdx.code) || `WBS-${tasks.length + 1}`;
    const status =
      cell(colIdx.status) ||
      (actual > planned ? `Delayed (+${Math.round((actual - planned) * 10) / 10}d)` : "Scheduled");

    tasks.push({
      code,
      task: taskName,
      startDay: cursor,
      plannedDays: planned,
      actualDays: actual,
      floatDays: 0,
      critical,
      delayRisk,
      status,
      varianceDays,
      workCenter,
      owner,
    });
    cursor += Math.max(1, Math.floor(planned * 0.8));
  }
  return tasks;
}

export const ScheduleUploader: React.FC<ScheduleUploaderProps> = ({
  activeFilename = null,
  activeTaskCount = 0,
  activeExtractionMethod = null,
  activeDocumentSummary = null,
  onUploadComplete,
  onAskCopilot,
  onToast,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number>(0);
  const [lastMethod, setLastMethod] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearSelection = () => {
    setSelectedFile(null);
    setParsedCount(0);
    setLastMethod(null);
    setLastSummary(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const isDocument = /\.(pdf|docx|doc)$/i.test(file.name);
    onToast?.(
      isDocument
        ? `Reading ${file.name} and extracting WBS schedule...`
        : `Ingesting and parsing WBS schedule from ${file.name}...`
    );

    try {
      await ingest(file, file.name, () => file.text());
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** Sends uploaded schedule to backend for CPM + XGBoost scoring; falls back to header-validated local CSV parsing when offline. */
  const ingest = async (blob: Blob, name: string, readText: () => Promise<string>) => {
    try {
      const result = await uploadScheduleFile(blob, name);
      if (result) {
        setSelectedFile(name);
        setParsedCount(result.tasks_extracted || result.tasks.length);
        setLastMethod(result.extraction_method ?? null);
        setLastSummary(result.document_summary ?? null);
        onUploadComplete?.(result);
        onToast?.(
          result.message ||
            `Normalized ${result.tasks_extracted} activities from ${name} and scored delay risk with XGBoost.`
        );
        return;
      }
    } catch (err) {
      clearSelection();
      onToast?.(err instanceof ScheduleUploadError ? err.message : `Could not ingest ${name}.`);
      return;
    }

    if (name.toLowerCase().endsWith(".csv")) {
      const parsed = parseCsvToWbs(await readText());
      if (parsed.length > 0) {
        setSelectedFile(name);
        setParsedCount(parsed.length);
        setLastMethod("table");
        setLastSummary(null);
        onUploadComplete?.({ tasks: parsed, tasks_extracted: parsed.length, filename: name });
        onToast?.(`Backend offline: parsed ${parsed.length} WBS rows locally from ${name}.`);
        return;
      }
    }

    clearSelection();
    onToast?.(
      "Backend offline: upload a valid CSV matching the template headers, or connect the MDIP service for Excel, PDF, and Word files."
    );
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_HEADER], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wbs_schedule_template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onToast?.("Downloaded blank CSV schedule template.");
  };

  const displayFile = selectedFile || activeFilename || null;
  const displayCount = selectedFile ? parsedCount : activeTaskCount;
  const displayMethod = selectedFile ? lastMethod : activeExtractionMethod;
  const displaySummary = selectedFile ? lastSummary : activeDocumentSummary;
  const isAiParsed = Boolean(displayMethod?.startsWith("gemini"));

  return (
    <div className="bg-white rounded-xl border border-rule p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-stamp" strokeWidth={1.5} />
            <span>Schedule Ingestion &amp; WBS Normalizer</span>
          </h2>
          <p className="text-xs text-ink-2 mt-0.5">
            Upload a CSV, Excel, PDF, or Word (.docx) schedule — AI reads PDF and Word files into WBS tasks and Copilot
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.docx,.doc"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sheet hover:bg-sheet-sunk text-ink border border-rule text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            <FileDown className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.5} />
            <span>Download CSV Template</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-stamp hover:bg-stamp-deep text-white text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isUploading ? "Normalizing..." : "Upload Schedule"}</span>
          </button>
        </div>
      </div>

      {displayFile && (
        <div className="mt-3.5 p-3 rounded-xl bg-stamp-wash border border-stamp-line space-y-2 text-xs text-stamp-deep">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 shrink-0 text-stamp" />
              <span>
                Active Ingestion File: <strong>{displayFile}</strong> ({displayCount} tasks)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onAskCopilot && (
                <button
                  type="button"
                  onClick={() =>
                    onAskCopilot(
                      `Review the uploaded schedule ${displayFile} and summarize the key tasks, bottlenecks, and SOP actions.`
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rule-strong bg-sheet px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-sheet-sunk cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-stamp" strokeWidth={1.6} />
                  <span>Ask Copilot</span>
                </button>
              )}
              <span className="font-semibold text-pass bg-pass-wash px-2 py-0.5 rounded border border-pass-line">
                {isAiParsed ? "AI Read" : "Normalized"}
              </span>
            </div>
          </div>
          {displaySummary && (
            <p className="text-xs leading-relaxed text-ink-2 border-t border-stamp-line/60 pt-2">
              {displaySummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
