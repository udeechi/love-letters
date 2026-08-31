import type { Metadata } from "next";
import { Playfair_Display, Lora } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Whispers",
  description: "A private notebook made with love",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Whispers",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a0d12",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${playfair.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-[#0d0a0f] text-[#e8dcc8] font-[family-name:var(--font-lora)] overflow-hidden">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
