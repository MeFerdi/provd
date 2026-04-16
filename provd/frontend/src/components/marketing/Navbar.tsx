"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { AuthCta } from "@/components/auth/AuthCta";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "/playground", label: "Playground" },
    { href: "/docs", label: "Docs" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
    { href: "/whitepaper", label: "Whitepaper" },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <motion.div
        initial={{ backdropFilter: "blur(0px)", background: "transparent" }}
        animate={
          scrolled || mobileOpen
            ? { backdropFilter: "blur(16px)", background: "rgba(13,17,23,0.90)" }
            : { backdropFilter: "blur(0px)", background: "transparent" }
        }
        transition={{ duration: 0.25 }}
        className="h-[60px] flex items-center px-4 md:px-8 border-b border-transparent"
        style={{ borderBottomColor: scrolled || mobileOpen ? "var(--bg-border)" : "transparent" }}
      >
        <Link href="/" className="flex flex-col justify-center mr-8 group" aria-label="Provd homepage">
          <span className="flex items-center">
            <Image
              src="/provd.svg"
              alt="Provd logo"
              width={480}
              height={240}
              className={`h-32 w-auto transition-all ${scrolled ? "drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]" : ""}`}
              priority
            />
          </span>
        </Link>

        <nav className="hidden md:flex gap-8 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-sans text-[14px] underline-offset-4 transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none px-1 ${
                scrolled ? "text-white/85 hover:text-white" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <AuthCta />
        </div>

        <button
          className={`md:hidden ml-auto flex items-center justify-center h-9 w-9 rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
            scrolled || mobileOpen ? "text-white" : "text-text-primary"
          }`}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <AnimatePresence initial={false} mode="wait">
            {mobileOpen ? (
              <motion.span key="close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <X size={28} />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Menu size={28} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[rgba(7,9,14,0.56)] backdrop-blur-md"
          >
            <div className="flex min-h-full items-start justify-center px-5 pt-20 pb-8">
              <div className="w-full max-w-sm rounded-3xl border border-bg-border bg-bg-surface/84 p-5 shadow-[0_20px_56px_rgba(0,0,0,0.26)]">
                <div className="mb-5 flex items-center justify-between">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Navigation</div>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-bg-border bg-bg-base/65 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label="Close menu"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X size={22} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block w-full rounded-2xl border border-transparent bg-bg-base/32 px-4 py-4 text-left font-sans text-[17px] text-text-primary transition hover:border-bg-border hover:bg-bg-elevated/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-5" onClick={() => setMobileOpen(false)}>
                  <AuthCta />
                </div>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
