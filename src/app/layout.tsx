import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

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
    default: "Kim Beom Seok | Frontend & AI Developer",
    template: "%s | Kim Beom Seok",
  },
  description:
    "AI 기술을 사용자가 체감할 수 있는 제품 경험으로 연결하는 Frontend & AI Developer 포트폴리오.",
  keywords: [
    "Kim Beom Seok",
    "Frontend Developer",
    "AI Developer",
    "Portfolio",
    "Voice AI",
    "Realtime UX",
  ],
  authors: [{ name: "Kim Beom Seok" }],
  openGraph: {
    title: "Kim Beom Seok | Frontend & AI Developer",
    description:
      "AI 기술을 사용자가 체감할 수 있는 제품 경험으로 연결합니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "Kim Beom Seok Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kim Beom Seok | Frontend & AI Developer",
    description:
      "AI 기술을 사용자가 체감할 수 있는 제품 경험으로 연결합니다.",
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
        {children}
      </body>
    </html>
  );
}
