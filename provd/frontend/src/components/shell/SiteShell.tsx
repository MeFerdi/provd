import * as React from "react";

import Footer from "@/components/marketing/Footer";
import Navbar from "@/components/shared/Navbar";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer />
    </>
  );
}

