import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Job Scam Detector",
  description: "가짜 해외 취업 제안과 수상한 채용 URL을 분석해 위험 점수와 근거를 보여주는 MVP 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <html lang="ko">
      <body>
        <div className="site-bg" />
        <div className="app-shell">
          <header className="topbar">
            <div className="brand-block">
              <Link href="/" className="brand">
                Job Scam Detector
              </Link>
              <p className="brand__tagline">해외 취업 제안과 수상한 채용 URL의 위험 신호를 빠르게 가늠하는 MVP</p>
            </div>
            <AppNav showAdminLink={isDevelopment} />
          </header>
          <main className="page-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
