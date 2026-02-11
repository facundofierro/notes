import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@agelum/shadcn";

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Agelum - AI Document Manager",
  description: "Manage AI documents inside development projects",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${caveat.variable}`}
      suppressHydrationWarning
    >
      <body className="flex h-screen bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
