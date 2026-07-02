/**
 * /terms — ข้อกำหนดการใช้งาน (Terms of Service)
 *
 * POLICY VERSION: terms_v1
 *
 * Human TODO (issue #4 — ready-for-human):
 *   - Replace ALL placeholder sections below with real, legally-reviewed
 *     Thai-language terms that cover at minimum:
 *       1. คำนิยาม (Definitions)
 *       2. สิทธิ์การใช้งาน (License / permitted use)
 *       3. ข้อห้าม (Prohibited conduct)
 *       4. เงื่อนไข subscription และการชำระเงิน (Subscription & payment terms)
 *       5. การยกเว้นความรับผิด (Limitation of liability / disclaimer)
 *       6. การเปลี่ยนแปลงข้อกำหนด (Amendments)
 *       7. กฎหมายที่ใช้บังคับ (Governing law — Thai law)
 *       8. การระงับข้อพิพาท (Dispute resolution)
 *   - Update TERMS_VERSION in src/lib/consent/consent.ts to 'terms_v2'
 *     when real wording is published, so existing users are re-prompted.
 *   - Stable URL: https://tcas.ai/terms — required for Omise merchant onboarding.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'ข้อกำหนดการใช้งาน',
  description: 'ข้อกำหนดการใช้งาน TCAS AI — เงื่อนไขที่ผู้ใช้ต้องยอมรับก่อนใช้บริการ',
  alternates: { canonical: '/terms' },
}

const SECTIONS = [
  {
    heading: '1. คำนิยาม',
    body: '[PLACEHOLDER — ระบุคำศัพท์หลักที่ใช้ในเอกสาร เช่น "บริการ" "ผู้ใช้" "เนื้อหา" "subscription"]',
  },
  {
    heading: '2. การยอมรับข้อกำหนด',
    body: '[PLACEHOLDER — อธิบายว่าการใช้บริการถือเป็นการยอมรับข้อกำหนด และข้อกำหนดสำหรับผู้เยาว์]',
  },
  {
    heading: '3. สิทธิ์การใช้งาน',
    body: '[PLACEHOLDER — ขอบเขตสิทธิ์ที่ผู้ใช้ได้รับ (non-exclusive, non-transferable) และข้อจำกัด]',
  },
  {
    heading: '4. ข้อห้ามและพฤติกรรมต้องห้าม',
    body: '[PLACEHOLDER — รายการสิ่งที่ผู้ใช้ไม่มีสิทธิ์กระทำ เช่น scraping, reverse engineering, ละเมิดลิขสิทธิ์]',
  },
  {
    heading: '5. Subscription และการชำระเงิน',
    body: '[PLACEHOLDER — รายละเอียดแผน trial/free/tier1/tier2 วิธีชำระเงิน นโยบายคืนเงิน ผ่าน Omise]',
  },
  {
    heading: '6. เนื้อหาและทรัพย์สินทางปัญญา',
    body: '[PLACEHOLDER — ความเป็นเจ้าของโจทย์/เนื้อหาที่ AI สร้าง และเนื้อหาที่ผู้ใช้ส่งเข้ามา]',
  },
  {
    heading: '7. การยกเว้นความรับผิด',
    body: '[PLACEHOLDER — disclaimer: บริการ "as-is", ไม่รับประกันผลการสอบ, จำกัดความรับผิดตามกฎหมายไทย]',
  },
  {
    heading: '8. การเปลี่ยนแปลงและการระงับบริการ',
    body: '[PLACEHOLDER — สิทธิ์เปลี่ยนแปลง ระงับ หรือยกเลิกบริการ พร้อมประกาศล่วงหน้า]',
  },
  {
    heading: '9. กฎหมายที่ใช้บังคับและการระงับข้อพิพาท',
    body: '[PLACEHOLDER — ระบุว่าบังคับตามกฎหมายไทย และช่องทางระงับข้อพิพาท]',
  },
]

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-2">
            เวอร์ชัน: terms_v1 · [PLACEHOLDER — วันที่มีผล]
          </p>
          <h1 className="text-3xl font-bold text-ink mb-4">ข้อกำหนดการใช้งาน</h1>
          <p className="text-ink-soft leading-relaxed">
            [PLACEHOLDER — บทนำ: กรุณาอ่านข้อกำหนดเหล่านี้อย่างละเอียดก่อนใช้บริการ
            การใช้บริการถือว่าคุณยอมรับข้อกำหนดทั้งหมด]
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {SECTIONS.map(({ heading, body }) => (
            <section key={heading}>
              <h2 className="text-lg font-semibold text-ink mb-2">{heading}</h2>
              <p className="text-ink-soft leading-relaxed">{body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-ruled text-sm text-ink-soft">
          <p>
            กลับไปที่{' '}
            <Link href="/" className="text-pen hover:underline">หน้าหลัก</Link>
            {' '}·{' '}
            <Link href="/privacy" className="text-pen hover:underline">นโยบายความเป็นส่วนตัว</Link>
          </p>
        </div>
      </main>
    </>
  )
}
