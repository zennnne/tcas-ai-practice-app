/**
 * /privacy — นโยบายความเป็นส่วนตัว (Privacy Policy)
 *
 * POLICY VERSION: privacy_v1
 *
 * Human TODO (issue #4 — ready-for-human):
 *   - Replace ALL placeholder sections below with real, legally-reviewed
 *     Thai-language policy text that covers at minimum:
 *       1. ข้อมูลที่เก็บรวบรวม (Data collected)
 *       2. วัตถุประสงค์การใช้ข้อมูล (Purpose of processing)
 *       3. การเปิดเผยข้อมูลแก่บุคคลภายนอก (Third-party disclosure)
 *       4. ระยะเวลาการเก็บข้อมูล (Retention period)
 *       5. สิทธิ์ของเจ้าของข้อมูล (Data subject rights under PDPA)
 *       6. ข้อมูลติดต่อ DPO หรือผู้รับผิดชอบ (Contact info)
 *       7. ผู้เยาว์ (Minors): ต้องระบุนโยบายตาม PDPA § 20
 *   - Update PRIVACY_VERSION in src/lib/consent/consent.ts to 'privacy_v2'
 *     when real wording is published, so existing users are re-prompted.
 *   - Stable URL: https://tcas.ai/privacy — required for Omise merchant onboarding.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว',
  description: 'นโยบายความเป็นส่วนตัวของ TCAS AI — วิธีที่เราเก็บ ใช้ และปกป้องข้อมูลของคุณ',
  alternates: { canonical: '/privacy' },
}

const SECTIONS = [
  {
    heading: '1. ข้อมูลที่เราเก็บรวบรวม',
    body: '[PLACEHOLDER — ระบุประเภทข้อมูลส่วนบุคคลที่เก็บ เช่น อีเมล ข้อมูลการใช้งาน คะแนนสอบ]',
  },
  {
    heading: '2. วัตถุประสงค์ในการประมวลผลข้อมูล',
    body: '[PLACEHOLDER — ระบุฐานกฎหมายและวัตถุประสงค์แต่ละข้อตาม PDPA]',
  },
  {
    heading: '3. การเปิดเผยข้อมูลแก่บุคคลภายนอก',
    body: '[PLACEHOLDER — ระบุ third party เช่น Supabase, Omise, Sentry พร้อม role และข้อตกลง DPA]',
  },
  {
    heading: '4. ระยะเวลาการเก็บรักษาข้อมูล',
    body: '[PLACEHOLDER — ระบุระยะเวลาเก็บข้อมูลแต่ละประเภทและเหตุผล]',
  },
  {
    heading: '5. สิทธิ์ของเจ้าของข้อมูล',
    body: '[PLACEHOLDER — อธิบายสิทธิ์ตาม PDPA: เข้าถึง แก้ไข ลบ คัดค้าน โอนย้าย ถอนความยินยอม พร้อมช่องทางใช้สิทธิ์]',
  },
  {
    heading: '6. ผู้เยาว์ (อายุต่ำกว่า 20 ปี)',
    body: '[PLACEHOLDER — นโยบายสำหรับผู้เยาว์ตาม PDPA § 20 รวมถึงข้อกำหนดความยินยอมจากผู้ปกครอง — รอคำแนะนำกฎหมายก่อนเติม]',
  },
  {
    heading: '7. การรักษาความปลอดภัย',
    body: '[PLACEHOLDER — อธิบายมาตรการรักษาความปลอดภัย]',
  },
  {
    heading: '8. ติดต่อเรา',
    body: '[PLACEHOLDER — ช่องทางติดต่อ DPO หรือผู้ควบคุมข้อมูล]',
  },
]

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="font-mono text-xs tracking-wider text-ink-soft uppercase mb-2">
            เวอร์ชัน: privacy_v1 · [PLACEHOLDER — วันที่มีผล]
          </p>
          <h1 className="text-3xl font-bold text-ink mb-4">นโยบายความเป็นส่วนตัว</h1>
          <p className="text-ink-soft leading-relaxed">
            [PLACEHOLDER — บทนำ: อธิบายสั้นๆ ว่า TCAS AI คืออะไรและทำไมถึงมีนโยบายนี้
            ระบุชื่อผู้ควบคุมข้อมูลและข้อมูลติดต่อ]
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
            <Link href="/terms" className="text-pen hover:underline">ข้อกำหนดการใช้งาน</Link>
          </p>
        </div>
      </main>
    </>
  )
}
