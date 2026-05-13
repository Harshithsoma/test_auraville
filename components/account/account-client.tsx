"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountClient() {
  const router = useRouter();
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const logout = useAuthStore((state) => state.logout);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    router.push("/");
    router.refresh();
  }

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUpdatingPassword) return;
    setPasswordMessage("");

    if (newPassword.length < 5) {
      setPasswordMessage("New password must be at least 5 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Confirm password must match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await commerceApi.account.updatePassword<{ data: { message: string } }, {
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
      }>({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setPasswordMessage(response.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof ApiError) {
        setPasswordMessage(error.message);
      } else {
        setPasswordMessage("Unable to update password right now.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  if (!hasMounted || isHydrating || !hasHydrated) {
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

  const quickActions = [
    {
      title: "My Orders",
      description: "Track current and past orders.",
      href: "/orders"
    },
    {
      title: "Saved Addresses",
      description: "Manage delivery addresses for faster checkout.",
      href: "/account/addresses"
    },
    {
      title: "Account Details",
      description: "View your profile contact information.",
      href: "/account"
    },
    {
      title: "Support / Contact",
      description: "Need help? Reach us quickly.",
      href: "mailto:admin@auraville.in"
    }
  ] as const;

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-6 md:p-8">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold">Your Auraville account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage orders, delivery addresses, and account details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-semibold">Account details</h2>
          <dl className="mt-4 space-y-3">
            <div className="rounded-lg bg-[var(--mint)] p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Name</dt>
              <dd className="mt-1 font-medium">{user.name?.trim() || "Not provided"}</dd>
            </div>
            <div className="rounded-lg bg-[var(--mint)] p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Email</dt>
              <dd className="mt-1 font-medium">{user.email}</dd>
            </div>
            <div className="rounded-lg bg-[var(--mint)] p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Phone</dt>
              <dd className="mt-1 font-medium">{user.phone?.trim() || "Not provided"}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>

          <form className="mt-6 border-t border-[var(--line)] pt-5" onSubmit={handlePasswordUpdate}>
            <h3 className="text-base font-semibold">Update Password</h3>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-sm font-semibold">Current password</span>
                <Input
                  className="mt-2"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">New password</span>
                <Input
                  className="mt-2"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Confirm new password</span>
                <Input
                  className="mt-2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            </div>
            <Button className="mt-4 w-full sm:w-auto" type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>
            <p className="mt-3 min-h-5 text-sm font-medium text-[var(--leaf-deep)]" role="status" aria-live="polite">
              {passwordMessage}
            </p>
          </form>
        </div>

        <div className="rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-semibold">Quick actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <a
                className="focus-ring rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 transition hover:border-[var(--leaf)] hover:bg-[var(--mint)]"
                href={action.href}
                key={action.title}
              >
                <p className="font-semibold">{action.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{action.description}</p>
              </a>
            ))}
            {user.role === "ADMIN" ? (
              <a
                className="focus-ring rounded-lg border border-[var(--leaf)] bg-[var(--mint)] p-4 transition hover:border-[var(--leaf-deep)]"
                href="/admin"
              >
                <p className="font-semibold">Admin Dashboard</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Manage products, orders, reviews, and homepage.</p>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
