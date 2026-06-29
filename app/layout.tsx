import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";

import { PostHogPageView } from "@/components/PostHogPageView";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Communication Intelligence",
  description:
    "AI-powered platform for scaling professional communication intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
