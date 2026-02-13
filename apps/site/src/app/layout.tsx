import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Agelum Notes | Markdown-Native Project Management for Developers",
  description:
    "Bring order to your development workflow with no vendor lock-in. Agelum Notes is markdown-native, AI-ready, and built for developers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
