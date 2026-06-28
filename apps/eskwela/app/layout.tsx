import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bantay Eskwela",
  description: "School Emergency Response Platform — City Government of Biñan, Laguna",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
