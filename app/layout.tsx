import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Auraville | Palmyra Sprout Snacks",
    template: "%s | Auraville"
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: absoluteUrl("/")
  },
  openGraph: {
    title: "Auraville | Palmyra Sprout Snacks",
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    images: [
      {
        url: "https://images.unsplash.com/photo-1632370161597-9c8429934d1b?auto=format&fit=crop&w=1200&q=86",
        width: 1200,
        height: 630,
        alt: "Auraville palmyra sprout snack range"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Auraville | Palmyra Sprout Snacks",
    description: siteConfig.description
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfffc"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
