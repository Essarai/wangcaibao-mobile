import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "旺财宝 · AI 商家经营助手",
  description: "看懂收款，经营有方。",

  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
