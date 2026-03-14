import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spare Me?",
  description: "Track bowling scores with friends",
  manifest: "/manifest.json",
  themeColor: "#0a0e1a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spare Me?",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
