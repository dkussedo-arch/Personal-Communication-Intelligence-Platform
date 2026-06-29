"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackPageViewed } from "@/lib/analytics";

function getPageName(pathname: string): string {
  if (pathname === "/") {
    return "home";
  }

  return pathname.replace(/^\//, "").replace(/\//g, "_") || "unknown";
}

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackPageViewed(getPageName(pathname));
  }, [pathname, searchParams]);

  return null;
}
