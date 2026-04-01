"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <motion.div
        initial={{ backdropFilter: "blur(0px)", background: "transparent" }}
        animate={scrolled ? { backdropFilter: "blur(16px)", background: "rgba(13,17,23,0.90)" } : { backdropFilter: "blur(0px)", background: "transparent" }}
        transition={{ duration: 0.25 }}
        className="h-[60px] flex items-center px-4 md:px-8 border-b border-transparent"
        style={{ borderBottomColor: scrolled ? "var(--bg-border)" : "transparent" }}
      >
        {/* Left: Wordmark */}
        <Link href="/" className="flex flex-col justify-center mr-8 group" aria-label="Provd homepage">
          <span className="flex items-center">
            <Image src="/provd.svg" alt="Provd logo" width={480} height={240} className="h-32 w-auto" priority />
          </span>
        </Link>

        {/* Center: Nav links (desktop) */}
        <nav className="hidden md:flex gap-8 flex-1 justify-center">
          {[
            { href: "/docs", label: "Docs" },
            { href: "/pricing", label: "Pricing" },
            { href: "/blog", label: "Blog" },
            { href: "/whitepaper", label: "Whitepaper" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-sans text-[14px] text-text-secondary hover:text-text-primary underline-offset-4 transition-all focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none px-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Auth buttons (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {/* <Link
            href="/signin"
            className="h-9 px-4 rounded-[4px] font-sans text-[14px] text-text-secondary border border-transparent hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            Sign In
          </Link> */}
          <Link
            href="/docs/quickstart"
            className="h-9 px-4 rounded-[4px] font-sans text-[14px] font-medium bg-accent text-[#07090E] hover:brightness-110 hover:-translate-y-[1px] transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            Get API Access
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto flex items-center justify-center h-9 w-9 rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <AnimatePresence initial={false}>
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

      {/* Mobile overlay menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg-base flex flex-col items-center justify-center"
          >
            <div className="flex flex-col gap-6 w-full max-w-xs mx-auto">
              {[
                { href: "/docs", label: "Docs" },
                { href: "/pricing", label: "Pricing" },
                { href: "/blog", label: "Blog" },
                { href: "/whitepaper", label: "Whitepaper" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block w-full text-center font-sans text-[18px] text-text-primary py-4 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href="/docs/quickstart"
              className="mt-10 w-full max-w-xs mx-auto h-12 flex items-center justify-center rounded-[4px] font-sans text-[16px] font-medium bg-accent text-[#07090E] hover:brightness-110 transition focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              onClick={() => setMobileOpen(false)}
            >
              Get API Access
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
