import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Security and data · MDIP",
  description: "How MDIP handles plant schedules, SOPs and decisions: workspaces, sign-in, uploads, AI processing and the audit log.",
};

const EN = (
  <>
    <section>
      <h2>What is private and what is shared</h2>
      <ul>
        <li>A schedule you upload is stored against your account and is not shown to other users.</li>
        <li>Sign-off decisions and the audit log are kept per workspace.</li>
        <li>
          The SOP knowledge base and IRoom records are shared by everyone on the same MDIP deployment. Plants that need
          them separated use the on-premise / private VPC licensing add-on.
        </li>
        <li>MDIP does not train its delay-risk model, or any other model, on your schedules or SOPs.</li>
      </ul>
    </section>

    <section>
      <h2>Sign-in and access</h2>
      <ul>
        <li>Users sign in with Google or with an email address and password through Supabase Auth.</li>
        <li>The MDIP API checks the signature of every sign-in token before it returns plant data.</li>
        <li>Repeated failed sign-ins, new registrations and schedule inspections are rate-limited.</li>
        <li>Each user acts in a role (for example Operations Manager or Quality Manager) that decides which cockpit they see.</li>
      </ul>
    </section>

    <section>
      <h2>File uploads</h2>
      <ul>
        <li>Every upload is identified by its actual content, not its file name, so a renamed program is rejected.</li>
        <li>Uploads are capped at 4 MB, and Word or Excel files that would unpack to more than 40 MB are refused.</li>
        <li>Uploaded SOPs become a draft that a person reviews clause by clause before anything is saved.</li>
      </ul>
    </section>

    <section>
      <h2>Where AI processing happens</h2>
      <p>Delay-risk scores come from MDIP&apos;s own model, which runs on the MDIP server in both modes.</p>
      <ul>
        <li>
          <strong className="font-medium text-ink">Cloud mode:</strong> PDF and Word schedules may be read by Google
          Gemini, and Copilot questions with the SOP clauses they retrieve may be answered by DeepSeek or Gemini.
        </li>
        <li>
          <strong className="font-medium text-ink">On-premises mode:</strong> the MDIP server reads documents and
          answers Copilot questions itself, without sending them to an outside AI service. With a dedicated deployment
          inside your network, schedules and SOPs never leave it.
        </li>
      </ul>
    </section>

    <section>
      <h2>Decisions and the audit log</h2>
      <p>
        MDIP recommends; people decide. Every authorization or override is written to the audit log with the reviewer,
        their role, the SOP clause cited, any notes and the time, and the log can be exported.
      </p>
    </section>

    <section>
      <h2>Hosting</h2>
      <p>
        The cloud service runs on Vercel and stores data in a Supabase Postgres database, served over HTTPS. With the
        on-premise / private VPC licensing add-on, MDIP runs in your own network instead.
      </p>
    </section>
  </>
);

const ID = (
  <>
    <section>
      <h2>Apa yang privat dan apa yang dibagikan</h2>
      <ul>
        <li>Jadwal yang Anda unggah disimpan pada akun Anda dan tidak ditampilkan ke pengguna lain.</li>
        <li>Keputusan pengesahan dan log audit disimpan per workspace.</li>
        <li>
          Basis pengetahuan SOP dan catatan IRoom dipakai bersama oleh semua pengguna di deployment MDIP yang sama. Pabrik
          yang perlu memisahkannya memakai layanan tambahan lisensi on-premise / VPC privat.
        </li>
        <li>MDIP tidak melatih model risiko keterlambatannya, maupun model lain, dengan jadwal atau SOP Anda.</li>
      </ul>
    </section>

    <section>
      <h2>Masuk dan akses</h2>
      <ul>
        <li>Pengguna masuk dengan Google atau dengan email dan kata sandi melalui Supabase Auth.</li>
        <li>API MDIP memeriksa tanda tangan setiap token masuk sebelum mengembalikan data pabrik.</li>
        <li>Upaya masuk yang gagal berulang, pendaftaran baru, dan inspeksi jadwal dibatasi frekuensinya.</li>
        <li>Setiap pengguna bertindak dalam satu peran (misalnya Manajer Operasional atau Manajer Mutu) yang menentukan kokpit yang dilihatnya.</li>
      </ul>
    </section>

    <section>
      <h2>Unggahan file</h2>
      <ul>
        <li>Setiap unggahan dikenali dari isi sebenarnya, bukan nama filenya, sehingga program yang diganti namanya ditolak.</li>
        <li>Unggahan dibatasi 4 MB, dan file Word atau Excel yang membengkak lebih dari 40 MB saat dibuka ditolak.</li>
        <li>SOP yang diunggah menjadi draf yang ditinjau seseorang klausul demi klausul sebelum apa pun disimpan.</li>
      </ul>
    </section>

    <section>
      <h2>Di mana pemrosesan AI terjadi</h2>
      <p>Nilai risiko keterlambatan berasal dari model MDIP sendiri, yang berjalan di server MDIP pada kedua mode.</p>
      <ul>
        <li>
          <strong className="font-medium text-ink">Mode cloud:</strong> jadwal PDF dan Word dapat dibaca Google Gemini,
          dan pertanyaan Copilot beserta klausul SOP yang diambilnya dapat dijawab DeepSeek atau Gemini.
        </li>
        <li>
          <strong className="font-medium text-ink">Mode on-premises:</strong> server MDIP membaca dokumen dan menjawab
          pertanyaan Copilot sendiri, tanpa mengirimnya ke layanan AI luar. Dengan deployment khusus di dalam jaringan
          Anda, jadwal dan SOP tidak pernah keluar dari jaringan itu.
        </li>
      </ul>
    </section>

    <section>
      <h2>Keputusan dan log audit</h2>
      <p>
        MDIP memberi rekomendasi; manusia yang memutuskan. Setiap persetujuan atau pembatalan dicatat di log audit beserta
        peninjau, perannya, klausul SOP yang dikutip, catatan, dan waktunya, dan log ini dapat diekspor.
      </p>
    </section>

    <section>
      <h2>Hosting</h2>
      <p>
        Layanan cloud berjalan di Vercel dan menyimpan data di basis data Supabase Postgres, dilayani melalui HTTPS. Dengan
        layanan tambahan lisensi on-premise / VPC privat, MDIP berjalan di jaringan Anda sendiri.
      </p>
    </section>
  </>
);

export default function SecurityPage() {
  return (
    <LegalPage
      title={["Security & data", "Keamanan & data"]}
      intro={[
        "How MDIP handles the schedules, SOPs and decisions your plant puts into it, written for IT and procurement reviewers.",
        "Cara MDIP menangani jadwal, SOP, dan keputusan yang dimasukkan pabrik Anda, ditulis untuk peninjau IT dan pengadaan.",
      ]}
      updated={["22 November 2026", "22 November 2026"]}
      en={EN}
      id={ID}
    />
  );
}
