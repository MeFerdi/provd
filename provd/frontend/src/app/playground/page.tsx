"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Legacy URL: forwards to the contract scanner.
export default function LegacyRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/scan");
  }, [router]);

  return (
    <main className="bg-bg-base px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-text-primary">This page has moved.</h1>
        <Button href="/scan" size="lg" className="mt-6">
          Go to the scanner
        </Button>
      </div>
    </main>
  );
}
