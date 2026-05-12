import type { Metadata } from "next";
import { AuthClient } from "@/components/auth/auth-client";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Login or Signup",
  description: "Access your Auraville account with OTP or password login, and mobile-verified signup.",
  alternates: {
    canonical: absoluteUrl("/auth")
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function AuthPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <AuthClient />
    </div>
  );
}
