import type { Metadata } from "next";
import { SavedAddressesClient } from "@/components/account/saved-addresses-client";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Saved Addresses",
  description: "Manage your saved Auraville delivery addresses for faster checkout.",
  alternates: {
    canonical: absoluteUrl("/account/addresses")
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function AccountAddressesPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <SavedAddressesClient />
    </div>
  );
}
