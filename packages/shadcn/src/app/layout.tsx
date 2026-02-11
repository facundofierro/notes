import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Shadcn Components",
  description: "Shadcn UI components for Agelum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
