import type { Metadata } from "next";
import { AccountClient } from "@/components/account/account-client";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Auraville profile, orders, and review access.",
  alternates: {
    canonical: absoluteUrl("/account")
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function AccountPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <AccountClient />
    </div>
  );
}
