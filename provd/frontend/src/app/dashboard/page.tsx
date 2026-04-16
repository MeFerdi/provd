"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getDashboardPath, getStoredSession } from "@/lib/auth";

export default function DashboardEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    router.replace(getDashboardPath(session.role));
  }, [router]);

  return <div className="min-h-[60vh]" />;
}
