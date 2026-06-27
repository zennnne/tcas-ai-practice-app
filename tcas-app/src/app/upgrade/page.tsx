import type { Metadata } from "next";
import UpgradeClient from "./UpgradeClient";

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

export default function UpgradePage() {
  return <UpgradeClient />;
}
