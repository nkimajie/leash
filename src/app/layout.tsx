import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // Link previews need the full address: APP_URL, or the address Render gives the service.
  metadataBase: new URL(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000"),
  title: { default: "Leash", template: "%s · Leash" },
  description: "A personal assistant that spends and sends money like you would, but only inside rules you set.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f5f0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
