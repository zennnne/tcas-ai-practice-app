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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tcas.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TCAS AI — เตรียมสอบให้ตรงจุด",
    template: "%s | TCAS AI",
  },
  description:
    "AI วิเคราะห์จุดอ่อน สร้างโจทย์ที่ตรงจุด และประเมินโอกาสติดคณะที่หวัง",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "TCAS AI",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${baiJamjuree.variable} ${plexMono.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          ข้ามไปยังเนื้อหาหลัก
        </a>
        {children}
      </body>
    </html>
  );
}
