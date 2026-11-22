import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms · MDIP",
  description: "Draft terms of service for MDIP pilots and plant licenses.",
};

const EN = (
  <>
    <section>
      <h2>The service</h2>
      <p>
        MDIP inspects project schedules, scores each task&apos;s delay risk, recommends actions that cite your SOPs, and
        records who authorized or overrode them. Pilots run for 30 days on one active schedule; plant and enterprise
        licenses are agreed in writing.
      </p>
    </section>

    <section>
      <h2>Recommendations, not decisions</h2>
      <p>
        Delay-risk scores and Copilot answers are estimates that support your planners and supervisors. A named person in
        your organisation authorizes or overrides every action, and your organisation stays responsible for the decisions
        it makes, including safety and quality decisions.
      </p>
    </section>

    <section>
      <h2>Your data</h2>
      <p>
        Schedules, SOPs, records and decisions you put into MDIP remain yours. You let MDIP process them only to provide
        the service, as described on the security and privacy pages. You can export your audit log at any time.
      </p>
    </section>

    <section>
      <h2>Acceptable use</h2>
      <ul>
        <li>Upload only files your organisation has the right to share with MDIP.</li>
        <li>Do not try to reach another customer&apos;s data or get around sign-in, rate limits or upload checks.</li>
        <li>Keep your account to yourself; each person signs in with their own account.</li>
      </ul>
    </section>

    <section>
      <h2>Availability and changes</h2>
      <p>
        We aim to keep MDIP available but do not promise uninterrupted service during a pilot. If these terms change, the
        date above changes and signed-in users are told before the new terms apply.
      </p>
    </section>
  </>
);

const ID = (
  <>
    <section>
      <h2>Layanan</h2>
      <p>
        MDIP memeriksa jadwal proyek, menilai risiko keterlambatan tiap tugas, menyarankan tindakan yang mengutip SOP Anda,
        dan mencatat siapa yang menyetujui atau membatalkannya. Pilot berjalan 30 hari pada satu jadwal aktif; lisensi pabrik
        dan enterprise disepakati secara tertulis.
      </p>
    </section>

    <section>
      <h2>Rekomendasi, bukan keputusan</h2>
      <p>
        Nilai risiko keterlambatan dan jawaban Copilot adalah perkiraan untuk membantu perencana dan supervisor Anda.
        Seseorang yang bernama di organisasi Anda menyetujui atau membatalkan setiap tindakan, dan organisasi Anda tetap
        bertanggung jawab atas keputusan yang diambil, termasuk keputusan keselamatan dan mutu.
      </p>
    </section>

    <section>
      <h2>Data Anda</h2>
      <p>
        Jadwal, SOP, catatan, dan keputusan yang Anda masukkan ke MDIP tetap milik Anda. Anda mengizinkan MDIP memprosesnya
        hanya untuk menyediakan layanan, sebagaimana dijelaskan di halaman keamanan dan privasi. Anda dapat mengekspor log
        audit kapan saja.
      </p>
    </section>

    <section>
      <h2>Penggunaan yang diizinkan</h2>
      <ul>
        <li>Unggah hanya file yang boleh dibagikan organisasi Anda kepada MDIP.</li>
        <li>Jangan mencoba mengakses data pelanggan lain atau melewati proses masuk, batas frekuensi, atau pemeriksaan unggahan.</li>
        <li>Gunakan akun Anda sendiri; setiap orang masuk dengan akunnya masing-masing.</li>
      </ul>
    </section>

    <section>
      <h2>Ketersediaan dan perubahan</h2>
      <p>
        Kami berupaya menjaga MDIP tetap tersedia, tetapi tidak menjanjikan layanan tanpa gangguan selama pilot. Jika
        ketentuan ini berubah, tanggal di atas ikut berubah dan pengguna yang masuk diberi tahu sebelum ketentuan baru
        berlaku.
      </p>
    </section>
  </>
);

export default function TermsPage() {
  return (
    <LegalPage
      title={["Terms of service", "Ketentuan layanan"]}
      intro={[
        "The terms for using MDIP during a pilot and under a plant or enterprise license.",
        "Ketentuan penggunaan MDIP selama pilot dan di bawah lisensi pabrik atau enterprise.",
      ]}
      updated={["22 November 2026", "22 November 2026"]}
      draft
      en={EN}
      id={ID}
    />
  );
}
