
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArchPilot — AI System Design",
  description:
    "Design system architectures visually and discover ways to improve them with AI.",
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
