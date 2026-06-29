import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TCAS AI — เตรียมสอบให้ตรงจุด",
  description:
    "AI วิเคราะห์จุดอ่อน สร้างโจทย์ตรงจุด และประเมินโอกาสติดคณะที่หวัง — ฝึกโจทย์ + Mock + โอกาสติดคณะ ครบในที่เดียว",
  alternates: { canonical: "/" },
  openGraph: {
    title: "TCAS AI — เตรียมสอบให้ตรงจุด",
    description:
      "AI วิเคราะห์จุดอ่อน สร้างโจทย์ตรงจุด และประเมินโอกาสติดคณะที่หวัง",
    url: "/",
    type: "website",
  },
  twitter: {
    title: "TCAS AI — เตรียมสอบให้ตรงจุด",
    description:
      "AI วิเคราะห์จุดอ่อน สร้างโจทย์ตรงจุด และประเมินโอกาสติดคณะที่หวัง",
  },
};

/* ─── Data ────────────────────────────────────────────────── */

const STATS = [
  { num: "90+", label: "คะแนนคุณภาพขั้นต่ำ", sub: "ทุกข้อผ่าน double-check" },
  { num: "75",  label: "กลุ่มโจทย์",          sub: "15 หัวข้อ × 5 ระดับ" },
  { num: "∞",   label: "โจทย์ใหม่",            sub: "AI สร้างให้ไม่ซ้ำ" },
];

const FEATURES = [
  {
    part: "ตอนที่ 01",
    title: "ฝึกโจทย์อัจฉริยะ",
    desc: "AI จับว่าคุณอ่อนหัวข้อไหน แล้วป้อนโจทย์ที่ตรงจุดนั้น ไม่เสียเวลากับสิ่งที่แม่นอยู่แล้ว",
    href: "/practice",
    cta: "เริ่มฝึก",
  },
  {
    part: "ตอนที่ 02",
    title: "สนามสอบ Real-time",
    desc: "เปิดห้องแข่งกับเพื่อนสูงสุด 10 คนแบบสด ฝึกทำข้อสอบใต้ความกดดันเหมือนสนามจริง",
    href: "/social",
    cta: "เข้าสนาม",
  },
  {
    part: "ตอนที่ 03",
    title: "Mock + โอกาสติดคณะ",
    desc: "สอบจำลองเต็มรูปแบบ AI ประเมินโอกาสติดคณะที่หวังจากคะแนนจริงและ cutoff ย้อนหลัง",
    href: "/mock",
    cta: "ลองสอบ",
  },
];

const STEPS = [
  { n: "1", title: "สมัครฟรี",            desc: "ไม่ต้องใส่บัตรเครดิต เริ่มได้ทันทีวันนี้" },
  { n: "2", title: "ฝึกทุกวัน",           desc: "AI ปรับระดับโจทย์ให้อัตโนมัติตามความก้าวหน้า" },
  { n: "3", title: "ดูโอกาสติดคณะ",      desc: "เทียบคะแนนกับ cutoff ของทุกคณะที่หวัง" },
];

/* ─── Page ────────────────────────────────────────────────── */

export default function Home() {
  return (
    <>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="paper-ruled relative overflow-hidden">
        {/* margin line, like a notebook */}
        <div className="absolute top-0 bottom-0 left-12 w-px bg-red-300/30 hidden lg:block" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-24 lg:pt-40 lg:pb-28">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">

            {/* Copy */}
            <div className="flex flex-col gap-7">
              <span className="fade-up delay-100 inline-flex items-center gap-2 self-start font-mono text-xs tracking-wider text-ink-soft uppercase">
                <span className="w-2 h-2 rounded-full bg-pen" />
                AI Practice · TCAS 69
              </span>

              <h1 className="fade-up delay-200 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] text-ink">
                เตรียมสอบ TCAS
                <br />
                ให้ <span className="mark">ตรงจุด</span>
              </h1>

              <p className="fade-up delay-300 text-lg text-ink-soft leading-relaxed max-w-md">
                AI วิเคราะห์ว่าคุณอ่อนตรงไหน สร้างโจทย์ที่ตรงกับจุดนั้น
                แล้วบอกโอกาสติดคณะที่หวัง — ครบในที่เดียว
              </p>

              <div className="fade-up delay-400 flex flex-wrap items-center gap-4 pt-1">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-base btn-pen"
                >
                  เริ่มฝึกฟรีวันนี้
                  <Arrow />
                </Link>
                <Link
                  href="/practice"
                  className="inline-flex items-center text-ink font-medium hover:text-pen transition-colors px-2 py-3.5"
                >
                  ดูตัวอย่างโจทย์ →
                </Link>
              </div>
            </div>

            {/* Signature: answer sheet */}
            <div className="flex justify-center lg:justify-end">
              <AnswerSheet />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="border-y border-ruled bg-panel/60">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-ruled">
          {STATS.map(({ num, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 py-6 sm:py-2 text-center">
              <div className="font-mono text-5xl font-bold text-ink tabular-nums">{num}</div>
              <div className="text-base font-semibold text-ink">{label}</div>
              <div className="text-sm text-ink-soft">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-xl mb-14">
          <p className="font-mono text-xs tracking-wider text-pen uppercase mb-3">แบบฝึกหัด</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-ink leading-tight">
            ครบทุกโหมด<br />ตั้งแต่ฝึกถึงสนามจริง
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map(({ part, title, desc, href, cta }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col bg-paper border border-ruled rounded-2xl p-7 transition-all duration-200 hover:border-pen hover:shadow-[0_12px_32px_-12px_rgba(47,91,255,0.25)] hover:-translate-y-1"
            >
              <span className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-5">{part}</span>
              <h3 className="text-xl font-bold text-ink mb-3">{title}</h3>
              <p className="text-sm text-ink-soft leading-relaxed mb-8">{desc}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-pen group-hover:gap-2.5 transition-all">
                {cta} <Arrow size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section className="bg-panel/60 border-y border-ruled py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl lg:text-5xl font-bold text-ink mb-14 leading-tight">
            เริ่มต้นใน 3 ขั้นตอน
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-5">
                <span className="flex-shrink-0 w-11 h-11 rounded-full border-2 border-pen text-pen font-mono font-bold flex items-center justify-center">
                  {n}
                </span>
                <div className="flex flex-col gap-2 pt-1">
                  <h3 className="text-lg font-bold text-ink">{title}</h3>
                  <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <section className="py-28 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-4xl lg:text-5xl font-bold text-ink mb-5 leading-tight">
            พร้อมสอบ <span className="mark">ติด</span> แล้วหรือยัง?
          </h2>
          <p className="text-lg text-ink-soft mb-10">
            เริ่มฟรีวันนี้ ไม่มีข้อผูกมัด ยกเลิกได้ทุกเมื่อ
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 text-lg btn-pen"
          >
            เริ่มฝึกฟรีวันนี้
            <Arrow size={18} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-ruled">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-soft">
          <span className="flex items-center gap-1 font-bold text-ink text-base">
            TCAS
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pen text-paper text-[11px]">ai</span>
          </span>
          <nav className="flex gap-6" aria-label="ลิงก์ส่วนท้าย">
            {[
              { href: "/practice", label: "ฝึกโจทย์" },
              { href: "/social",   label: "สนามสอบ" },
              { href: "/mock",     label: "Mock Test" },
              { href: "/upgrade",  label: "ราคา" },
              { href: "/privacy",  label: "Privacy" },
              { href: "/terms",    label: "Terms" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-ink transition-colors">
                {label}
              </Link>
            ))}
          </nav>
          <span>© 2025 TCAS AI</span>
        </div>
      </footer>
    </>
  );
}

/* ─── Signature component: OMR answer sheet ──────────────── */

type Row = { n: string; answer: 0 | 1 | 2 | 3; state: "done" | "filling" | "blank" };

const SHEET_ROWS: Row[] = [
  { n: "07", answer: 1, state: "done" },
  { n: "08", answer: 3, state: "done" },
  { n: "09", answer: 0, state: "filling" },
  { n: "10", answer: 2, state: "blank" },
];

const BUBBLE_LABELS = ["ก", "ข", "ค", "ง"];

function AnswerSheet() {
  return (
    <div className="drift relative w-full max-w-sm">
      <div className="bg-paper border border-ruled rounded-2xl shadow-[0_24px_60px_-20px_rgba(24,34,59,0.28)] p-6 select-none">

        {/* Sheet header */}
        <div className="flex items-center justify-between pb-4 border-b border-dashed border-ruled">
          <div>
            <p className="font-mono text-[11px] tracking-wider text-ink-soft uppercase">กระดาษคำตอบ</p>
            <p className="text-sm font-semibold text-ink mt-0.5">ฟิสิกส์ · กลศาสตร์</p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-correct/10 text-correct font-semibold">
            ระดับ 3/5
          </span>
        </div>

        {/* Question preview */}
        <p className="text-sm text-ink leading-relaxed py-4">
          วัตถุมวล 2 kg ถูกแรงคงที่ 10 N บนพื้นไร้แรงเสียดทาน
          จงหาความเร่ง
        </p>

        {/* Bubble rows */}
        <div className="flex flex-col gap-2.5">
          {SHEET_ROWS.map((row) => (
            <BubbleRow key={row.n} row={row} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-5 mt-4 border-t border-dashed border-ruled">
          <span className="w-1.5 h-1.5 rounded-full bg-pen" />
          <span className="text-xs text-ink-soft">AI สร้าง · ตรวจซ้ำ 2 โมเดลแล้ว</span>
        </div>
      </div>
    </div>
  );
}

function BubbleRow({ row }: { row: Row }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-ink-soft w-6">{row.n}</span>
      <div className="flex items-center gap-2">
        {BUBBLE_LABELS.map((label, i) => {
          const isAnswer = i === row.answer;
          const filled = isAnswer && row.state === "done";
          const filling = isAnswer && row.state === "filling";

          return (
            <span
              key={label}
              className={[
                "w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono transition-colors",
                filling
                  ? "bubble-filling"
                  : filled
                    ? "bg-pen text-paper border-pen"
                    : "border-graphite text-graphite",
              ].join(" ")}
            >
              {label}
            </span>
          );
        })}
      </div>
      {row.state === "done" && (
        <svg className="ml-auto text-correct" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function Arrow({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
