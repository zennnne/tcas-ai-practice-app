import type { Metadata } from "next";
import { Bai_Jamjuree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const baiJamjuree = Bai_Jamjuree({
  variable: "--font-bai",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TCAS AI — เตรียมสอบให้ตรงจุด",
  description:
    "AI วิเคราะห์จุดอ่อน สร้างโจทย์ที่ตรงจุด และประเมินโอกาสติดคณะที่หวัง",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${baiJamjuree.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
