import React from "react";
import { LinkButton } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { Words } from "./Words";
import { InspectionRow, TONE_BAR, verdictFor } from "./inspection";

/**
 * A read-only slice of the cockpit's critical-path view, drawn from the same rows as the inspection table,
 * so visitors see what "Open live cockpit" leads to. Clicking a bar opens that task's drawer in the table.
 */
export function CockpitPreview({
  rows,
  selected,
  onSelect,
}: {
  rows: InspectionRow[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const t = useT();
  const horizon = Math.max(1, ...rows.map((r) => r.start + Math.max(r.planned, r.forecast)));
  const pct = (days: number) => `${(days / horizon) * 100}%`;
  const hold = rows.filter((r) => verdictFor(r).tone === "hold").length;
  const critical = rows.filter((r) => r.critical).length;
  const slip = rows.reduce((sum, r) => sum + Math.max(0, r.forecast - r.planned), 0);
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((horizon * i) / 4));
  const d = t("d", "h");

  return (
    <section aria-labelledby="cockpit-title" className="border-t border-rule-strong px-5 py-12 sm:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="cockpit-title" className="font-display text-[34px] font-bold leading-tight text-ink">
            <Words>{t("Inside the cockpit", "Di dalam kokpit")}</Words>
          </h2>
          <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-ink-2">
            {t(
              "The same schedule on the critical-path timeline planners work from. Select a bar to read the reasons behind its verdict.",
              "Jadwal yang sama pada linimasa jalur kritis yang dipakai perencana. Pilih sebuah batang untuk membaca alasan di balik putusannya."
            )}
          </p>
        </div>
        <LinkButton href="/dashboard" variant="secondary" size="lg">
          {t("Open live cockpit", "Buka kokpit langsung")}
        </LinkButton>
      </div>

      <div className="mt-6 border border-rule-strong bg-sheet">
        <dl className="grid grid-cols-3 divide-x divide-rule border-b border-rule-strong">
          {[
            { label: t("Tasks on hold", "Tugas ditahan"), value: t(`${hold} of ${rows.length}`, `${hold} dari ${rows.length}`) },
            { label: t("On the critical path", "Di jalur kritis"), value: `${critical}` },
            { label: t("Forecast overrun", "Prakiraan kelebihan"), value: `+${slip} ${d}` },
          ].map((k) => (
            <div key={k.label} className="px-4 py-3 sm:px-5">
              <dt className="text-xs text-ink-3">{k.label}</dt>
              <dd className="mt-0.5 whitespace-nowrap font-mono-numbers text-lg text-ink sm:text-2xl">{k.value}</dd>
            </div>
          ))}
        </dl>

        <div className="px-4 py-4 sm:px-5">
          <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 text-xs text-ink-3 sm:grid-cols-[13rem_1fr]">
            <span>{t("Task", "Tugas")}</span>
            <div className="relative h-4 font-mono-numbers" aria-hidden="true">
              {ticks.map((tick, i) => (
                <span
                  key={i}
                  className={`absolute top-0 ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                  style={{ left: pct(tick) }}
                >
                  {d}
                  {tick}
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-1 space-y-1">
            {rows.map((r) => {
              const v = verdictFor(r);
              const active = selected === r.code;
              return (
                <li key={r.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.code)}
                    aria-pressed={active}
                    aria-label={t(
                      `${r.code} ${r.task}: starts day ${r.start}, planned ${r.planned} days, forecast ${r.forecast} days, ${v.label}`,
                      `${r.code} ${t(r.task)}: mulai hari ${r.start}, rencana ${r.planned} hari, prakiraan ${r.forecast} hari, ${t(v.label)}`
                    )}
                    className={`grid w-full cursor-pointer grid-cols-[5.5rem_1fr] items-center gap-x-3 rounded-sm py-1.5 text-left transition-colors sm:grid-cols-[13rem_1fr] ${
                      active ? "bg-stamp-wash" : "hover:bg-paper"
                    }`}
                  >
                    <span className="truncate pl-1 text-xs text-ink">
                      <span className="font-mono-numbers text-ink-3">{r.code.replace("WBS-", "")}</span>
                      <span className="hidden sm:inline"> {t(r.task)}</span>
                    </span>
                    <span className="relative block h-5" aria-hidden="true">
                      {/* Planned duration: hairline outline; forecast: solid bar in the verdict's colour */}
                      <span
                        className="absolute top-0 h-full border border-dashed border-ink-3"
                        style={{ left: pct(r.start), width: pct(r.planned) }}
                      />
                      <span
                        data-gantt-bar
                        className={`absolute top-1 h-3 origin-left ${TONE_BAR[v.tone]} ${v.tone === "neutral" ? "opacity-40" : ""}`}
                        style={{ left: pct(r.start), width: pct(r.forecast) }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-5 border border-dashed border-ink-3" aria-hidden="true" /> {t("Planned", "Rencana")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 bg-hold" aria-hidden="true" /> {t("Forecast, coloured by verdict", "Prakiraan, diwarnai sesuai putusan")}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
