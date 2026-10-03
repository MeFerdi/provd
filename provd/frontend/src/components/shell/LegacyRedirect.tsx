"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Client-side forward for retired URLs (static export has no server redirects). */
export function LegacyRedirect({ to, label }: { to: string; label: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <main className="bg-bg-base px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl text-text-primary">This page has moved.</h1>
        <Button href={to} size="lg" className="mt-6">
          {label}
        </Button>
      </div>
    </main>
  );
}
