"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "signup";

export function AuthClient() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("email") ?? "");

    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }

    setEmail(nextEmail);
    setStep("otp");
    setMessage(`We sent a one-time code to ${nextEmail}.`);
  }

  function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const otp = String(formData.get("otp") ?? "");

    if (!/^\d{6}$/.test(otp)) {
      setMessage("Enter the 6-digit code from your email.");
      return;
    }

    login({ email });
    setMessage("You are signed in. Redirecting to your profile...");
    router.push("/account");
  }

  return (
    <section className="mx-auto max-w-xl rounded-lg border border-[var(--line)] bg-white p-6 md:p-8" aria-labelledby="auth-title">
      <div className="grid grid-cols-2 rounded-lg bg-[var(--mint)] p-1">
        {(["login", "signup"] as AuthMode[]).map((item) => (
          <button
            className="focus-ring rounded-lg px-4 py-3 text-sm font-semibold transition data-[active=true]:bg-white data-[active=true]:shadow"
            data-active={mode === item}
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setStep("email");
              setMessage("");
            }}
          >
            {item === "login" ? "Login" : "Signup"}
          </button>
        ))}
      </div>

      <h1 id="auth-title" className="mt-8 text-3xl font-semibold">
        {mode === "login" ? "Welcome back." : "Create your Auraville account."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Continue with email OTP for a light, password-free checkout flow.
      </p>

      {step === "email" ? (
        <form className="mt-7 space-y-5" onSubmit={handleEmailSubmit}>
          <label className="block">
            <span className="text-sm font-semibold">Email address</span>
            <Input className="mt-2" name="email" type="email" autoComplete="email" />
          </label>
          <Button className="w-full" type="submit">
            Send OTP
          </Button>
        </form>
      ) : (
        <form className="mt-7 space-y-5" onSubmit={handleOtpSubmit}>
          <label className="block">
            <span className="text-sm font-semibold">One-time code</span>
            <Input className="mt-2" name="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
          </label>
          <Button className="w-full" type="submit">
            Verify and continue
          </Button>
          <button
            className="focus-ring rounded-lg text-sm font-semibold text-[var(--leaf-deep)]"
            type="button"
            onClick={() => {
              setStep("email");
              setMessage("");
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-5 min-h-6 text-sm text-[var(--leaf-deep)]" role="status" aria-live="polite">
        {message || (email ? `Code destination: ${email}` : "")}
      </p>
    </section>
  );
}
