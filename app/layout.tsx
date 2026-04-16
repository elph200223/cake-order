import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nostalgia Coffee Roastery",
  description: "Cake ordering website for Nostalgia Coffee Roastery",
  metadataBase: new URL("https://www.nostalgiacoffeeroastery.com"),
  openGraph: {
    title: "Nostalgia Coffee Roastery",
    description: "Cake ordering website for Nostalgia Coffee Roastery",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Nostalgia Coffee Roastery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}