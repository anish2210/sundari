import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { createMetadata } from "@/lib/seo";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = createMetadata({
  description:
    "Sundari Jewellers - Fine gold, diamond, and bridal jewellery celebrating the art of Indian heritage.",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#180606",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={cormorant.variable}>
      <body>{children}</body>
    </html>
  );
}
