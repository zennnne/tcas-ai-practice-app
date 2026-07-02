import type { Metadata } from "next";
import UpgradeClient from "./UpgradeClient";
import { createClient } from "@/lib/supabase/server";
import { trialDaysLeft } from "@/lib/billing/trial";

export const metadata: Metadata = {
  title: "ราคาและแพ็กเกจ",
  description:
    "เลือกแพ็กเกจ TCAS AI ที่ใช่สำหรับคุณ — Starter 99 บาท/เดือน หรือ Pro 249 บาท/เดือน ยกเลิกได้ทุกเมื่อ",
  alternates: { canonical: "/upgrade" },
  openGraph: {
    title: "ราคาและแพ็กเกจ | TCAS AI",
    description:
      "เลือกแพ็กเกจ TCAS AI ที่ใช่สำหรับคุณ ราคาเริ่มต้น 99 บาท/เดือน ยกเลิกได้ทุกเมื่อ",
    url: "/upgrade",
    type: "website",
  },
  twitter: {
    title: "ราคาและแพ็กเกจ | TCAS AI",
    description:
      "เลือกแพ็กเกจ TCAS AI ที่ใช่สำหรับคุณ ราคาเริ่มต้น 99 บาท/เดือน ยกเลิกได้ทุกเมื่อ",
  },
};

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // trial info (issue #12 story 4: user รู้ว่า trial มีอะไร/เหลือกี่วัน) — guest ไม่มี user เลยข้าม
  let trialInfo: { daysLeft: number } | null = null;
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub?.status === "trial" && sub.trial_ends_at) {
      trialInfo = { daysLeft: trialDaysLeft(sub.trial_ends_at, new Date()) };
    }
  }

  return <UpgradeClient trialInfo={trialInfo} />;
}
