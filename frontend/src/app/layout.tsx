import type { Metadata } from "next";
import "./globals.css";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-var",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans-var",
});

export const metadata: Metadata = {
  title: "Notemind — Your meetings, understood instantly",
  description: "AI-powered meeting transcription, summaries, and action items. Never miss what matters.",
  openGraph: {
    title: "Notemind — Your meetings, understood instantly",
    description: "AI-powered meeting transcription, summaries, and action items.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", serif.variable, sans.variable)}>
      <body className="antialiased bg-white text-ink">
        {children}
      </body>
    </html>
  );
}
