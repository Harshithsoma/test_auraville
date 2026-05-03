"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";

export function AccountClient() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    router.push("/");
    router.refresh();
  }

  if (!hasMounted || isHydrating) {
    return <div className="rounded-lg border border-[var(--line)] bg-white p-8">Loading profile...</div>;
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold">Login to view your profile.</h1>
        <p className="mt-3 text-[var(--muted)]">Your orders and reviews are linked to your email.</p>
        <Button className="mt-6" href="/auth">
          Login
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl rounded-lg border border-[var(--line)] bg-white p-8">
      <p className="text-sm font-semibold uppercase text-[var(--coral)]">Profile</p>
      <h1 className="mt-4 text-3xl font-semibold">Your Auraville account</h1>
      <dl className="mt-8 space-y-4">
        <div className="rounded-lg bg-[var(--mint)] p-4">
          <dt className="text-sm font-semibold">Email</dt>
          <dd className="mt-1 text-[var(--muted)]">{user.email}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button href="/orders" variant="secondary">
          View orders
        </Button>
        {user.role === "ADMIN" ? (
          <Button href="/admin" variant="secondary">
            Open admin dashboard
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          disabled={isLoggingOut}
          onClick={handleLogout}
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </section>
  );
}
