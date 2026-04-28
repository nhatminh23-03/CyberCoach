import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CyberCoach",
  description: "Scam detection and safer decision guidance for suspicious messages, links, files, screenshots, and calls.",
  applicationName: "CyberCoach",
  openGraph: {
    title: "CyberCoach",
    description: "Scam detection and safer decision guidance for suspicious messages, links, files, screenshots, and calls.",
    siteName: "CyberCoach",
    images: ["/app_logo.png"]
  },
  twitter: {
    card: "summary",
    title: "CyberCoach",
    description: "Scam detection and safer decision guidance for suspicious messages, links, files, screenshots, and calls.",
    images: ["/app_logo.png"]
  },
  appleWebApp: {
    capable: true,
    title: "CyberCoach",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/app_logo.png",
    shortcut: "/app_logo.png",
    apple: "/app_logo.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background font-body text-on-background antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
