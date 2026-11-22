import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Words } from "./Words";

type Pair = [string, string];

const PILOT: { when: Pair; title: Pair; body: Pair }[] = [
  {
    when: ["Day 1", "Hari 1"],
    title: ["Upload an export", "Unggah ekspor"],
    body: [
      "A CSV or Excel export from SAP PS, MS Project or Primavera P6. No integration and no IT ticket.",
      "Ekspor CSV atau Excel dari SAP PS, MS Project, atau Primavera P6. Tanpa integrasi dan tanpa tiket IT.",
    ],
  },
  {
    when: ["Week 1", "Minggu 1"],
    title: ["Baseline audit", "Audit baseline"],
    body: [
      "Every task is scored. You review the hold and watch list and the critical path with your planning lead.",
      "Setiap tugas dinilai. Anda meninjau daftar tahan dan pantau serta jalur kritis bersama kepala perencanaan.",
    ],
  },
  {
    when: ["Weeks 2–3", "Minggu 2–3"],
    title: ["Weekly re-inspection", "Inspeksi ulang mingguan"],
    body: [
      "Upload the updated export each week. Supervisors authorize or override recommended actions; plant SOPs go into the knowledge base.",
      "Unggah ekspor terbaru setiap minggu. Supervisor menyetujui atau membatalkan tindakan yang disarankan; SOP pabrik dimasukkan ke basis pengetahuan.",
    ],
  },
  {
    when: ["Week 4", "Minggu 4"],
    title: ["Sign-off review", "Tinjauan pengesahan"],
    body: [
      "Compare the tasks MDIP flagged with the ones that actually slipped, export the audit log, and choose to stay on Starter or move to Pro.",
      "Bandingkan tugas yang ditandai MDIP dengan yang benar-benar mundur, ekspor log audit, lalu pilih tetap di Starter atau naik ke Pro.",
    ],
  },
];

const FAQ: { q: Pair; a: Pair }[] = [
  {
    q: ["Can MDIP run on-premises or in our own VPC?", "Bisakah MDIP berjalan on-premises atau di VPC kami sendiri?"],
    a: [
      "Yes, with the on-premise / private VPC licensing add-on. In on-premises mode the MDIP server reads documents and answers Copilot questions itself, without sending them to an outside AI service.",
      "Bisa, dengan layanan tambahan lisensi on-premise / VPC privat. Dalam mode on-premises, server MDIP membaca dokumen dan menjawab pertanyaan Copilot sendiri, tanpa mengirimnya ke layanan AI luar.",
    ],
  },
  {
    q: ["Is our schedule data used to train public models?", "Apakah data jadwal kami dipakai untuk melatih model publik?"],
    a: [
      "MDIP does not train any model on your schedules or SOPs; its delay-risk model was trained on public project data. In cloud mode, PDF and Word schedules may be read by Google Gemini and Copilot questions answered by DeepSeek or Gemini; on-premises mode keeps both on the MDIP server.",
      "MDIP tidak melatih model apa pun dengan jadwal atau SOP Anda; model risiko keterlambatannya dilatih dengan data proyek publik. Dalam mode cloud, jadwal PDF dan Word dapat dibaca Google Gemini dan pertanyaan Copilot dijawab DeepSeek atau Gemini; mode on-premises menjaga keduanya di server MDIP.",
    ],
  },
  {
    q: ["How do SAP PS and Primavera P6 schedules get in?", "Bagaimana jadwal SAP PS dan Primavera P6 masuk?"],
    a: [
      "As file exports: CSV or Excel for the inspector, plus PDF and Word in the scheduler. Each upload is checked by its actual content, not its file name, and capped at 4 MB. Direct sync with SAP PS, P6, MS Project or your ERP is a one-time ERP connector implementation.",
      "Sebagai file ekspor: CSV atau Excel untuk inspektur, ditambah PDF dan Word di penjadwal. Setiap unggahan diperiksa dari isi sebenarnya, bukan nama filenya, dengan batas 4 MB. Sinkronisasi langsung dengan SAP PS, P6, MS Project, atau ERP Anda tersedia lewat implementasi konektor ERP satu kali.",
    ],
  },
  {
    q: ["How much IT effort does a pilot need?", "Seberapa besar usaha IT untuk pilot?"],
    a: [
      "None beyond creating accounts. Users sign in with Google or email, and planners upload the exports they already produce. There is nothing to install for the cloud pilot.",
      "Tidak ada selain membuat akun. Pengguna masuk dengan Google atau email, dan perencana mengunggah ekspor yang sudah biasa mereka buat. Tidak ada yang perlu dipasang untuk pilot cloud.",
    ],
  },
  {
    q: ["Who is accountable for the recommendations?", "Siapa yang bertanggung jawab atas rekomendasi?"],
    a: [
      "A named supervisor. MDIP recommends; a person authorizes or overrides every action, and each decision is written to the audit log with who made it and when.",
      "Supervisor bernama. MDIP memberi rekomendasi; seseorang menyetujui atau membatalkan setiap tindakan, dan tiap keputusan dicatat di log audit beserta siapa yang membuatnya dan kapan.",
    ],
  },
];

/** What a 30-day pilot looks like, and the questions procurement asks before signing one. */
export function PilotAndFaq() {
  const t = useT();
  return (
    <section id="pilot" aria-labelledby="pilot-title" className="border-t border-rule-strong px-5 py-12 sm:px-8">
      <h2 id="pilot-title" className="font-display text-[34px] font-bold leading-tight text-ink">
        <Words>{t("What happens in a 30-day pilot", "Apa yang terjadi dalam pilot 30 hari")}</Words>
      </h2>
      <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-ink-2">
        {t(
          "One active schedule, your own planners, and a decision at the end based on what actually slipped.",
          "Satu jadwal aktif, perencana Anda sendiri, dan keputusan di akhir berdasarkan apa yang benar-benar mundur."
        )}
      </p>

      <ol className="mt-8 grid border border-rule-strong bg-sheet md:grid-cols-4 md:divide-x md:divide-rule-strong">
        {PILOT.map((step, i) => (
          <li key={step.when[0]} className={`p-5 ${i > 0 ? "border-t border-rule-strong md:border-t-0" : ""}`}>
            <p className="font-mono-numbers text-xs text-stamp">{t(...step.when)}</p>
            <h3 className="mt-1.5 font-display text-lg font-bold text-ink">{t(...step.title)}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{t(...step.body)}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h3 className="font-display text-2xl font-bold text-ink">{t("Procurement questions", "Pertanyaan pengadaan")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            {t("The short answers. The full detail is on the", "Jawaban singkatnya. Rincian lengkapnya ada di")}{" "}
            <Link href="/security" className="font-medium text-stamp hover:underline">
              {t("security and data page", "halaman keamanan dan data")}
            </Link>
            .
          </p>
        </div>
        <div className="divide-y divide-rule border-y border-rule-strong lg:col-span-8">
          {FAQ.map((item) => (
            <details key={item.q[0]} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-sm font-medium text-ink hover:text-stamp [&::-webkit-details-marker]:hidden">
                {t(...item.q)}
                <Plus className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-45" strokeWidth={1.5} />
              </summary>
              <p className="pb-4 pr-8 text-sm leading-relaxed text-ink-2">{t(...item.a)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
