import type { ReactNode } from "react";

import Footer from "@/components/marketing/Footer";
import Navbar from "@/components/marketing/Navbar";
import type { SiteId } from "@/lib/sites";

export function RootChrome({ children, site = "main" }: { children: ReactNode; site?: SiteId }) {
  return (
    <>
      <Navbar site={site} />
      <div>{children}</div>
      <Footer site={site} />
    </>
  );
}
