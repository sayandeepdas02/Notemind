import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notemind — Your meetings, understood instantly",
  description: "Real-time AI transcription and structured summaries for your meetings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
