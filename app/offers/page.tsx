import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { marketSpotlight } from "@/lib/promotions";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Launch Offer",
  description: "View the current Auraville market offer for the palmyra sprout energy bar.",
  alternates: {
    canonical: absoluteUrl("/offers")
  }
};

export default function OffersPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <section className="rounded-lg bg-[var(--leaf-deep)] p-8 text-white md:p-12">
        <p className="text-sm font-bold uppercase text-[#ffd9de]">{marketSpotlight.label}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          {marketSpotlight.headline}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#dfeee5]">{marketSpotlight.subline}</p>
        <div className="mt-8 inline-flex rounded-lg border border-white/25 bg-white/10 px-5 py-3 font-bold">
          Code: {marketSpotlight.code}
        </div>
        <div className="mt-8">
          <Button className="bg-white text-[var(--leaf-deep)] hover:bg-[var(--mint)]" href="/product/palmyra-sprout-energy-bar">
            Shop offer
          </Button>
        </div>
      </section>
    </div>
  );
}
