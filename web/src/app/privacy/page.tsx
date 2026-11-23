import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy · MDIP",
  description: "Draft privacy notice: what MDIP collects, why, who processes it and how long it is kept.",
};

const securityLink = (label: string) => (
  <Link href="/security" className="font-medium text-stamp hover:underline">
    {label}
  </Link>
);

const EN = (
  <>
    <section>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name, email address and, if you sign in with Google, your Google profile name.</li>
        <li>The role you work in, such as Operations Manager or Plant Manager.</li>
        <li>Files you upload: project schedules and SOP documents, and the drafts and clauses made from them.</li>
        <li>Records you enter in IRoom streams, and the decisions you authorize or override, with notes.</li>
      </ul>
    </section>

    <section>
      <h2>Why we use it</h2>
      <ul>
        <li>To sign you in and show the cockpit for your role.</li>
        <li>To score schedule delay risk and answer Copilot questions from your plant&apos;s SOPs.</li>
        <li>To keep the audit log of who decided what, and when.</li>
      </ul>
      <p>We do not sell your data, show advertising, or train any model on your schedules or SOPs.</p>
    </section>

    <section>
      <h2>Who processes it</h2>
      <ul>
        <li>Supabase stores accounts and plant data and handles sign-in.</li>
        <li>Vercel hosts the website and the MDIP API.</li>
        <li>Google sign-in confirms your identity if you choose it.</li>
        <li>
          In cloud mode only: DeepSeek or Google Gemini may read PDF and Word schedules, and DeepSeek or Gemini may answer Copilot
          questions with the SOP clauses they retrieve. On-premises mode does not use them.
        </li>
      </ul>
    </section>

    <section>
      <h2>Cookies and browser storage</h2>
      <p>
        MDIP uses no advertising or analytics cookies. Your browser keeps your sign-in session, your language and a few
        workspace settings in local storage so you stay signed in between visits.
      </p>
    </section>

    <section>
      <h2>How long we keep it</h2>
      <p>
        Account data and plant data are kept while your plant&apos;s account is active. The audit log is kept for the
        life of the workspace because it is the record of every decision. Enterprise plans can set custom retention.
      </p>
    </section>

    <section>
      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete your personal data. Security details are on the{" "}
        {securityLink("security and data page")}. A contact address for privacy requests will be added here before this
        notice takes effect.
      </p>
    </section>
  </>
);

const ID = (
  <>
    <section>
      <h2>Data yang kami kumpulkan</h2>
      <ul>
        <li>Detail akun: nama, alamat email, dan jika Anda masuk dengan Google, nama profil Google Anda.</li>
        <li>Peran kerja Anda, misalnya Manajer Operasional atau Manajer Pabrik.</li>
        <li>File yang Anda unggah: jadwal proyek dan dokumen SOP, beserta draf dan klausul yang dibuat darinya.</li>
        <li>Catatan yang Anda masukkan di aliran IRoom, serta keputusan yang Anda setujui atau batalkan, beserta catatannya.</li>
      </ul>
    </section>

    <section>
      <h2>Untuk apa kami menggunakannya</h2>
      <ul>
        <li>Untuk memasukkan Anda dan menampilkan kokpit sesuai peran Anda.</li>
        <li>Untuk menilai risiko keterlambatan jadwal dan menjawab pertanyaan Copilot dari SOP pabrik Anda.</li>
        <li>Untuk menyimpan log audit tentang siapa memutuskan apa, dan kapan.</li>
      </ul>
      <p>Kami tidak menjual data Anda, tidak menampilkan iklan, dan tidak melatih model apa pun dengan jadwal atau SOP Anda.</p>
    </section>

    <section>
      <h2>Siapa yang memprosesnya</h2>
      <ul>
        <li>Supabase menyimpan akun dan data pabrik serta menangani proses masuk.</li>
        <li>Vercel menjadi host situs web dan API MDIP.</li>
        <li>Masuk dengan Google memastikan identitas Anda jika Anda memilihnya.</li>
        <li>
          Hanya dalam mode cloud: DeepSeek atau Google Gemini dapat membaca jadwal PDF dan Word, dan DeepSeek atau Gemini dapat menjawab
          pertanyaan Copilot beserta klausul SOP yang diambilnya. Mode on-premises tidak menggunakannya.
        </li>
      </ul>
    </section>

    <section>
      <h2>Cookie dan penyimpanan browser</h2>
      <p>
        MDIP tidak memakai cookie iklan atau analitik. Browser Anda menyimpan sesi masuk, pilihan bahasa, dan beberapa
        pengaturan workspace di local storage agar Anda tetap masuk di antara kunjungan.
      </p>
    </section>

    <section>
      <h2>Berapa lama kami menyimpannya</h2>
      <p>
        Data akun dan data pabrik disimpan selama akun pabrik Anda aktif. Log audit disimpan sepanjang umur workspace karena
        menjadi catatan setiap keputusan. Paket enterprise dapat mengatur retensi sendiri.
      </p>
    </section>

    <section>
      <h2>Pilihan Anda</h2>
      <p>
        Anda dapat meminta untuk melihat, memperbaiki, atau menghapus data pribadi Anda. Rincian keamanan ada di{" "}
        {securityLink("halaman keamanan dan data")}. Alamat kontak untuk permintaan privasi akan ditambahkan di sini sebelum
        pemberitahuan ini berlaku.
      </p>
    </section>
  </>
);

export default function PrivacyPage() {
  return (
    <LegalPage
      title={["Privacy", "Privasi"]}
      intro={[
        "What MDIP collects when your plant uses it, why, and who else processes it.",
        "Data apa yang dikumpulkan MDIP saat pabrik Anda menggunakannya, untuk apa, dan siapa lagi yang memprosesnya.",
      ]}
      updated={["22 November 2026", "22 November 2026"]}
      draft
      en={EN}
      id={ID}
    />
  );
}
