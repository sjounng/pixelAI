import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixelAI — AI Pixel Art Generator",
  description: "프롬프트 한 줄로 픽셀 아트를 생성하세요.",
  openGraph: {
    title: "PixelAI",
    description: "AI 픽셀 아트 생성기",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
