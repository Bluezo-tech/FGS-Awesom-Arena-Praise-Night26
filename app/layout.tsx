import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Foursquare Praise Night Media Gallery",
  description: "Watch and revisit Foursquare Gospel Church Praise Night recordings.",
  openGraph: {
    siteName: "Foursquare Praise Night Media Gallery",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
