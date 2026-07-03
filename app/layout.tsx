import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthSessionBootstrap } from "@/components/auth/auth-session-bootstrap";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { RouteProgress } from "@/components/layout/route-progress";
import { absoluteUrl, defaultShareImageUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Auraville | Healthy Snacks India",
    template: "%s | Auraville"
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: absoluteUrl("/")
  },
  openGraph: {
    title: "Auraville | Healthy Snacks India",
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    images: [
      {
        url: defaultShareImageUrl(),
        width: 1200,
        height: 630,
        alt: "Auraville palmyra sprout healthy snacks"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Auraville | Healthy Snacks India",
    description: siteConfig.description,
    images: [defaultShareImageUrl()]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfffc"
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${absoluteUrl("/")}#organization`,
  name: siteConfig.name,
  url: absoluteUrl("/"),
  sameAs: [
    "https://instagram.com/auraville.in",
    "https://facebook.com/auraville.in",
    "https://x.com/auraville_in"
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "admin@auraville.in",
      telephone: "+919087268344",
      areaServed: "IN",
      availableLanguage: ["en"]
    }
  ]
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${absoluteUrl("/")}#website`,
  name: siteConfig.name,
  url: absoluteUrl("/"),
  publisher: {
    "@id": `${absoluteUrl("/")}#organization`
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <script
          id="auraville-organization-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          id="auraville-website-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <RouteProgress />
        <AuthSessionBootstrap />
        <Header />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
      </body>
    </html>
  );
}
