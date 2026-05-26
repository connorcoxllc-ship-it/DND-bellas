import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bella's Campaign — D&D Character Hub",
  description:
    "Interactive D&D character sheets for the whole party. Build, level up, and view each other's heroes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
