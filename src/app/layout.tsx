import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { GlobalDocent } from "@/features/docent/GlobalDocent";

// 영문 디스플레이 폰트. 한글은 --font-display 스택의 Pretendard로 폴백된다.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FAFAFA",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://beomseok-portfolio.vercel.app"),
  title: {
    default: "Kim Beom Seok | AI Product Engineer",
    template: "%s | Kim Beom Seok",
  },
  description:
    "데이터에서 AI 판단, 시스템 행동까지 연결하는 AI Product Engineer 포트폴리오 — Hybrid RAG, AI Agent, AI coding orchestration, Computer Vision.",
  keywords: [
    "Kim Beom Seok",
    "AI Product Engineer",
    "AI Engineer",
    "Portfolio",
    "RAG",
    "AI Agent",
    "Computer Vision",
  ],
  authors: [{ name: "Kim Beom Seok" }],
  openGraph: {
    title: "Kim Beom Seok | AI Product Engineer",
    description:
      "데이터에서 AI 판단, 시스템 행동까지 연결하는 구조를 설계하고 배포합니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "Kim Beom Seok Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kim Beom Seok | AI Product Engineer",
    description:
      "데이터에서 AI 판단, 시스템 행동까지 연결하는 구조를 설계하고 배포합니다.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={display.variable}>
      <body>
        <SmoothScroll />
        <div className="global-docent-layout" data-global-docent-layout>
          {children}
        </div>
        <GlobalDocent />
      </body>
    </html>
  );
}
