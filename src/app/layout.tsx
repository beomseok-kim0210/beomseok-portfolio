import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
