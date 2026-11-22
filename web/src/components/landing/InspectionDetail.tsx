import React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { InspectionRow, verdictFor } from "./inspection";

type T = ReturnType<typeof useT>;

type DrawerCopy = {
  heading: string;
  footnote: string;
  /** Why it is not worse: shown under the drivers (green for pass/complete, muted for watch). */
  note: string | null;
  next: string;
  cta: { label: string; href: string };
};

/** Verdict-specific wording for the drawer; upstream slip is only mentioned when it is known. */
function drawerCopy(row: InspectionRow, t: T): DrawerCopy {
  const { tone } = verdictFor(row);
  const pct = row.risk === null ? 0 : Math.round(row.risk * 100);
  const overrun = Math.max(0, row.forecast - row.planned);
  const upstream = row.upstreamSlip ?? 0;
  const wc = row.workCenter || t("the assigned work center", "work center yang ditugaskan");
  const d = t("d", "h");
  const onPlan = t(`Duration on plan (${row.planned} d → ${row.forecast} d)`, `Durasi sesuai rencana (${row.planned} h → ${row.forecast} h)`);
  const shap = t("Ranked by SHAP impact, most influential first", "Diurutkan menurut dampak SHAP, paling berpengaruh dulu");
  const scheduler = "/dashboard/scheduler";

  if (row.done) {
    return {
      heading: t("Completion record", "Catatan penyelesaian"),
      footnote: t("Closed · excluded from active delay scoring", "Ditutup · tidak lagi dinilai risiko keterlambatannya"),
      note:
        overrun > 0
          ? t(`Finished +${overrun} d over plan (${row.planned} d → ${row.forecast} d)`, `Selesai +${overrun} h melebihi rencana (${row.planned} h → ${row.forecast} h)`)
          : t(`Finished on plan (${row.planned} d)`, `Selesai sesuai rencana (${row.planned} h)`),
      next: t(
        "The actual duration is fixed in every Monte Carlo run, so any variance still carries into the tasks downstream. The decisions around it stay in the audit log.",
        "Durasi aktualnya tetap di setiap simulasi Monte Carlo, jadi selisihnya tetap terbawa ke tugas hilir. Keputusan terkait tetap tersimpan di log audit."
      ),
      cta: { label: t("View audit trail", "Lihat jejak audit"), href: "/dashboard" },
    };
  }
  if (tone === "hold") {
    return {
      heading: t(`Primary risk drivers · ${pct}%`, `Pemicu risiko utama · ${pct}%`),
      footnote: shap,
      note: null,
      next:
        overrun > 0
          ? t(
              `Supervisor sign-off required. Confirm whether ${wc} can recover +${overrun} d through re-sequencing or overtime, or approve a revised baseline.`,
              `Perlu pengesahan supervisor. Pastikan apakah ${wc} bisa mengejar +${overrun} ${d} lewat pengurutan ulang atau lembur, atau setujui baseline baru.`
            )
          : upstream > 0
            ? t(
                `Escalated by +${upstream} d of upstream slippage. Hold the ${wc} release or compress the predecessor handoff before the work cell stalls.`,
                `Naik karena kemunduran hulu +${upstream} ${d}. Tahan rilis ${wc} atau percepat serah terima pendahulu sebelum sel kerja berhenti.`
              )
            : t(
                `Supervisor sign-off required. Review ${wc} capacity and the predecessor handoff before the next shift update.`,
                `Perlu pengesahan supervisor. Tinjau kapasitas ${wc} dan serah terima pendahulu sebelum pembaruan shift berikutnya.`
              ),
      cta: { label: t("Review intervention in scheduler", "Tinjau intervensi di penjadwal"), href: scheduler },
    };
  }
  if (tone === "warn") {
    return {
      heading: t(`Risk drivers to monitor · ${pct}%`, `Pemicu risiko yang dipantau · ${pct}%`),
      footnote: shap,
      note: overrun === 0 ? onPlan : null,
      next: t(
        `Elevated slip exposure without a confirmed stop. Verify ${wc} capacity and predecessor readiness before the next schedule upload so this does not escalate to hold.`,
        `Risiko mundur meningkat tanpa penghentian yang pasti. Periksa kapasitas ${wc} dan kesiapan pendahulu sebelum unggahan jadwal berikutnya agar tidak naik menjadi tahan.`
      ),
      cta: { label: t("Inspect buffer in scheduler", "Periksa cadangan di penjadwal"), href: scheduler },
    };
  }
  const drivers = row.drivers?.length ?? 0;
  return {
    heading: drivers > 0 ? t(`Residual risk factors · ${pct}%`, `Faktor risiko tersisa · ${pct}%`) : t(`Low delay risk · ${pct}%`, `Risiko terlambat rendah · ${pct}%`),
    footnote:
      drivers > 0
        ? t("Minor contributors below the alert threshold", "Penyumbang kecil di bawah ambang peringatan")
        : t("No risk drivers above the threshold", "Tidak ada pemicu risiko di atas ambang"),
    note: overrun === 0 ? onPlan : row.float ? t(`${row.float} d of float available`, `Tersedia float ${row.float} h`) : null,
    next:
      row.critical && upstream > 0
        ? t(
            `Own duration is on track (${row.planned} d), but the start depends on resolving +${upstream} d of upstream slippage. No action on ${wc} yet; it is scored again on the next upload.`,
            `Durasinya sendiri sesuai jalur (${row.planned} h), tetapi waktu mulainya bergantung pada penyelesaian kemunduran hulu +${upstream} h. Belum perlu tindakan di ${wc}; tugas dinilai ulang pada unggahan berikutnya.`
          )
        : t(
            "Execution is within plan. It stays on the active schedule and is scored again automatically on the next upload.",
            "Pelaksanaan sesuai rencana. Tugas tetap di jadwal aktif dan dinilai ulang otomatis pada unggahan berikutnya."
          ),
    cta: { label: t("Open in the scheduler", "Buka di penjadwal"), href: scheduler },
  };
}

/** The drawer under an inspection row: the schedule facts and model drivers behind its verdict. */
export function InspectionDetail({ row, id }: { row: InspectionRow; id: string }) {
  const t = useT();
  const { tone } = verdictFor(row);
  const copy = drawerCopy(row, t);
  const overrun = row.forecast - row.planned;
  const drivers = row.done ? [] : (row.drivers ?? []).slice(0, tone === "pass" ? 2 : 3);
  const positive = row.done || tone === "pass";
  const d = t("d", "h");

  return (
    <div id={id} className="grid gap-5 border-l-2 border-stamp bg-paper px-4 py-4 text-sm sm:grid-cols-3 sm:px-5">
      <div>
        <p className="text-xs font-medium text-ink-3">{t("Schedule facts", "Fakta jadwal")}</p>
        <dl className="mt-2 space-y-1.5 text-ink-2 [&_dd]:font-mono-numbers [&_dd]:text-ink [&>div]:flex [&>div]:justify-between [&>div]:gap-3">
          <div>
            <dt>{t("Starts on", "Mulai pada")}</dt>
            <dd>{t(`day ${row.start}`, `hari ${row.start}`)}</dd>
          </div>
          <div>
            <dt>{t("Planned → forecast", "Rencana → prakiraan")}</dt>
            <dd>
              {row.planned} {d} → {row.forecast} {d}
            </dd>
          </div>
          <div>
            <dt>{t("Overrun", "Kelebihan")}</dt>
            <dd className={overrun > 0 ? "font-semibold text-hold" : ""}>{overrun > 0 ? `+${overrun} ${d}` : t("none", "tidak ada")}</dd>
          </div>
          {row.upstreamSlip ? (
            <div>
              <dt>{t("Pushed by predecessors", "Didorong pendahulu")}</dt>
              <dd>
                +{row.upstreamSlip} {d}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Float</dt>
            <dd>{row.float === null ? "n/a" : `${row.float} ${d}`}</dd>
          </div>
          <div>
            <dt>{t("Critical path", "Jalur kritis")}</dt>
            <dd>{row.critical ? t("yes", "ya") : t("no", "tidak")}</dd>
          </div>
          {row.workCenter && (
            <div>
              <dt>Work center</dt>
              <dd>{t(row.workCenter)}</dd>
            </div>
          )}
        </dl>
      </div>

      <div>
        <p className="text-xs font-medium text-ink-3">{copy.heading}</p>
        {drivers.length > 0 && (
          <ol className="mt-2 space-y-1.5">
            {drivers.map((dr, i) => (
              <li key={dr} className="flex gap-2.5 text-ink">
                <span className="font-mono-numbers text-xs leading-5 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                {t(dr)}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-ink-3">{copy.footnote}</p>
        {copy.note && (
          <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${positive ? "text-pass" : "text-ink-2"}`}>
            {positive && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
            {copy.note}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-ink-3">{t("What happens next", "Langkah berikutnya")}</p>
        <p className="mt-2 leading-relaxed text-ink-2">{copy.next}</p>
        <Link
          href={copy.cta.href}
          className="mt-2 inline-flex items-center gap-1 py-1 text-sm font-medium text-stamp hover:text-stamp-deep hover:underline"
        >
          {copy.cta.label}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}
