import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foursquare Media Gallery",
  description: "Watch and revisit Foursquare Gospel Church media.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
