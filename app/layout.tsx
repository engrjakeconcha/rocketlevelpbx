import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RocketLevel AI Routing Console",
  description: "Smarter Routing. Less Complexity."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
