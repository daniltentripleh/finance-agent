import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Agent",
  description: "AI-powered financial analysis agent — DCF, comps, earnings, LBO, and more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
