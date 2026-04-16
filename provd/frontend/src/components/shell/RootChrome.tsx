"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Footer from "@/components/marketing/Footer";
import Navbar from "@/components/marketing/Navbar";

export function RootChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideMarketingShell = pathname.startsWith("/dashboard") || pathname.startsWith("/login");

  if (hideMarketingShell) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div>{children}</div>
      <Footer />
    </>
  );
}
