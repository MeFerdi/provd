import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-bg-base border-t border-bg-border pt-16 pb-8 px-6 text-text-secondary">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
             <span className="flex items-center">
              <Image src="/provd.svg" alt="Provd logo" width={480} height={240} className="h-32 w-auto" priority />
              </span>
          </div>
          <div className="text-xs font-mono text-accent-primary mb-3 tracking-[0.22em] uppercase">Trust Infrastructure</div>
          <div className="text-sm">contact@provd.io</div>
          <div className="mt-4 text-xs text-text-muted max-w-xs">
            Real-time counterparty risk scoring for African P2P crypto markets.
          </div>
        </div>

        <div>
          <div className="font-sans font-semibold mb-3 text-text-primary">Docs</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/docs/api-reference" className="hover:text-text-primary transition">
                API Reference
              </Link>
            </li>
            <li>
              <Link href="/docs/quickstart" className="hover:text-text-primary transition">
                Quickstart
              </Link>
            </li>
            <li>
              <Link href="/docs/authentication" className="hover:text-text-primary transition">
                Authentication
              </Link>
            </li>
            <li>
              <Link href="/docs/changelog" className="hover:text-text-primary transition">
                Changelog
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-sans font-semibold mb-3 text-text-primary">Company</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-text-primary transition">
                About
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-text-primary transition">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/careers" className="hover:text-text-primary transition">
                Careers
              </Link>
            </li>
            <li>
              <Link href="/whitepaper" className="hover:text-text-primary transition">
                Whitepaper
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-sans font-semibold mb-3 text-text-primary">Legal</div>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy-policy" className="hover:text-text-primary transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-text-primary transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/data-processing" className="hover:text-text-primary transition">
                Data Processing
              </Link>
            </li>
            <li>
              <Link href="/cookie-policy" className="hover:text-text-primary transition">
                Cookie Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-bg-border pt-6 text-xs text-center text-text-muted">
        © 2026 Provd Technologies Ltd. <span className="mx-2">•</span> Built for Africa.
      </div>
    </footer>
  );
}
