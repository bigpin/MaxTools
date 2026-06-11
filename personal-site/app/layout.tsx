import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Max — 独立开发者",
  description: "Max的个人网站，展示10个微信小程序工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="antialiased">
      <body className="bg-deep text-text-primary min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
