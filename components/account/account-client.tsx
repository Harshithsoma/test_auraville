"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PasswordMethod = "current" | "otp";

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }
  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
}

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
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [passwordMethod, setPasswordMethod] = useState<PasswordMethod>("current");
  const [otpCode, setOtpCode] = useState("");
  const [otpPassword, setOtpPassword] = useState("");
  const [otpConfirmPassword, setOtpConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingWithOtp, setIsResettingWithOtp] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    router.push("/");
    router.refresh();
  }

  function resetSecurityForm(method: PasswordMethod = "current") {
    setPasswordMethod(method);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpCode("");
    setOtpPassword("");
    setOtpConfirmPassword("");
    setOtpSent(false);
    setPasswordMessage("");
    setIsSendingOtp(false);
    setIsResettingWithOtp(false);
  }

  function openSecurityCard() {
    setIsSecurityOpen(true);
    resetSecurityForm("current");
  }

  function switchSecurityMethod(method: PasswordMethod) {
    if (isUpdatingPassword || isSendingOtp || isResettingWithOtp) {
      return;
    }
    resetSecurityForm(method);
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
      setIsSecurityOpen(false);
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

  async function handleSendOtpForPasswordReset() {
    if (!user || isSendingOtp || isResettingWithOtp) {
      return;
    }

    setPasswordMessage("");
    setIsSendingOtp(true);
    try {
      const response = await commerceApi.auth.forgotPasswordSend<
        { data: { message: string } },
        { identifier: string }
      >({
        identifier: user.email
      });
      setOtpSent(true);
      setPasswordMessage(response.data.message || "OTP sent. Enter the code to reset password.");
    } catch (error) {
      if (error instanceof ApiError) {
        setPasswordMessage(error.message);
      } else {
        setPasswordMessage("Unable to send OTP right now.");
      }
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleOtpPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isResettingWithOtp) {
      return;
    }

    setPasswordMessage("");

    if (!otpSent) {
      setPasswordMessage("Send OTP first.");
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setPasswordMessage("Please enter a valid 6-digit OTP.");
      return;
    }

    if (otpPassword.length < 5) {
      setPasswordMessage("New password must be at least 5 characters.");
      return;
    }

    if (otpPassword !== otpConfirmPassword) {
      setPasswordMessage("Confirm password must match.");
      return;
    }

    setIsResettingWithOtp(true);
    try {
      const response = await commerceApi.auth.forgotPasswordReset<
        { data: { message: string } },
        { identifier: string; otp: string; newPassword: string; confirmPassword: string }
      >({
        identifier: user.email,
        otp: otpCode,
        newPassword: otpPassword,
        confirmPassword: otpConfirmPassword
      });
      setPasswordMessage(response.data.message || "Password updated successfully.");
      setOtpCode("");
      setOtpPassword("");
      setOtpConfirmPassword("");
      setOtpSent(false);
      setIsSecurityOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setPasswordMessage(error.message);
      } else {
        setPasswordMessage("Unable to reset password right now.");
      }
    } finally {
      setIsResettingWithOtp(false);
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

          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4">
              <h3 className="text-base font-semibold">Password & Security</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Manage your password and account access.</p>
              {!isSecurityOpen ? (
                <Button className="mt-4 w-full sm:w-auto" type="button" onClick={openSecurityCard}>
                  Update password
                </Button>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--mint)] p-1">
                    <button
                      type="button"
                      className="focus-ring rounded-md px-3 py-2 text-sm font-semibold transition data-[active=true]:bg-white data-[active=true]:text-[var(--leaf-deep)]"
                      data-active={passwordMethod === "current"}
                      onClick={() => switchSecurityMethod("current")}
                    >
                      Use current password
                    </button>
                    <button
                      type="button"
                      className="focus-ring rounded-md px-3 py-2 text-sm font-semibold transition data-[active=true]:bg-white data-[active=true]:text-[var(--leaf-deep)]"
                      data-active={passwordMethod === "otp"}
                      onClick={() => switchSecurityMethod("otp")}
                    >
                      Use OTP instead
                    </button>
                  </div>

                  {passwordMethod === "current" ? (
                    <form className="space-y-3" onSubmit={handlePasswordUpdate}>
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
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button className="w-full sm:w-auto" type="submit" disabled={isUpdatingPassword}>
                          {isUpdatingPassword ? "Updating..." : "Update password"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full sm:w-auto"
                          disabled={isUpdatingPassword}
                          onClick={() => {
                            setIsSecurityOpen(false);
                            resetSecurityForm("current");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form className="space-y-3" onSubmit={handleOtpPasswordReset}>
                      <p className="text-sm text-[var(--muted)]">
                        We&apos;ll send a reset code to{" "}
                        <span className="font-semibold text-[var(--foreground)]">{maskEmail(user.email)}</span>.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          disabled={isSendingOtp || isResettingWithOtp}
                          onClick={() => {
                            void handleSendOtpForPasswordReset();
                          }}
                        >
                          {isSendingOtp ? "Sending OTP..." : "Send OTP to my email"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full sm:w-auto"
                          disabled={isSendingOtp || isResettingWithOtp}
                          onClick={() => {
                            setIsSecurityOpen(false);
                            resetSecurityForm("current");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      {otpSent ? (
                        <>
                          <label className="block">
                            <span className="text-sm font-semibold">Enter 6-digit OTP</span>
                            <Input
                              className="mt-2"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              placeholder="123456"
                              value={otpCode}
                              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                            />
                          </label>
                          <label className="block">
                            <span className="text-sm font-semibold">New password</span>
                            <Input
                              className="mt-2"
                              type="password"
                              autoComplete="new-password"
                              value={otpPassword}
                              onChange={(event) => setOtpPassword(event.target.value)}
                            />
                          </label>
                          <label className="block">
                            <span className="text-sm font-semibold">Confirm new password</span>
                            <Input
                              className="mt-2"
                              type="password"
                              autoComplete="new-password"
                              value={otpConfirmPassword}
                              onChange={(event) => setOtpConfirmPassword(event.target.value)}
                            />
                          </label>
                          <Button
                            className="w-full sm:w-auto"
                            type="submit"
                            disabled={isResettingWithOtp}
                          >
                            {isResettingWithOtp ? "Updating..." : "Update password"}
                          </Button>
                        </>
                      ) : null}
                    </form>
                  )}
                </div>
              )}
            </div>
            {passwordMessage ? (
              <p className="mt-3 min-h-5 text-sm font-medium text-[var(--leaf-deep)]" role="status" aria-live="polite">
                {passwordMessage}
              </p>
            ) : null}
          </div>
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
