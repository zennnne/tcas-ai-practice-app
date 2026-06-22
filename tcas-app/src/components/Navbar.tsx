"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/practice", label: "ฝึกโจทย์" },
  { href: "/social",   label: "สนามสอบ" },
  { href: "/mock",     label: "Mock Test" },
  { href: "/upgrade",  label: "ราคา" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1 text-xl font-bold tracking-tight text-ink">
      TCAS
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pen text-paper text-[11px] font-bold">
        ai
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 border-b ${
        scrolled || mobileOpen
          ? "bg-paper/90 backdrop-blur-md border-ruled"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8" aria-label="เมนูหลัก">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-ink-soft hover:text-ink transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-ink-soft hover:text-ink transition-colors px-4 py-2"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/signup"
            className="text-sm px-5 py-2.5 btn-pen"
          >
            เริ่มฟรี
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={mobileOpen}
        >
          <span className={`block w-5 h-0.5 bg-ink origin-center transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-0.5 bg-ink transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-ink origin-center transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-ruled bg-paper px-6 py-5 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="text-base text-ink-soft hover:text-ink py-2.5 transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-5 mt-2 border-t border-ruled">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-center text-sm border border-ruled rounded-full py-2.5 text-ink-soft hover:text-ink hover:border-ink-soft transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="text-center text-sm py-3 btn-pen"
            >
              เริ่มฟรี
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
