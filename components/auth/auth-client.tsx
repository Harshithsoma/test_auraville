"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "signup";
type LoginStep = "identifier" | "otp" | "password";
type SignupStep = "form" | "otp";
type IdentifierMode = "email" | "phone";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
};

type AuthSuccessResponse = {
  data: {
    user: AuthUser;
    accessToken: string;
  };
};

type AuthMessageResponse = {
  data: {
    message: string;
  };
};

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;
const SPECIAL_CHAR_PATTERN = /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/;
const RESEND_COOLDOWN_SECONDS = 30;
const DEFAULT_LOGIN_COUNTRY_CODE = "+91";

type SignupPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

function isValidRedirect(path: string | null): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

function detectIdentifierMode(value: string): IdentifierMode {
  const trimmed = value.trim();
  if (!trimmed) {
    return "email";
  }

  if (/[A-Za-z@]/.test(trimmed)) {
    return "email";
  }

  return "phone";
}

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "***";
  }

  const prefix = localPart.slice(0, 2);
  return `${prefix}${"*".repeat(Math.max(1, localPart.length - 2))}@${domain}`;
}

function passwordChecks(password: string, confirmPassword: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: SPECIAL_CHAR_PATTERN.test(password),
    confirmMatch: password.length > 0 && password === confirmPassword
  };
}

export function AuthClient() {
  const router = useRouter();
  const completeAuth = useAuthStore((state) => state.completeAuth);
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);

  const [mode, setMode] = useState<AuthMode>("login");
  const [loginStep, setLoginStep] = useState<LoginStep>("identifier");
  const [signupStep, setSignupStep] = useState<SignupStep>("form");
  const [redirectPath, setRedirectPath] = useState("/account");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupResendSeconds, setSignupResendSeconds] = useState(0);
  const [signupOtpContext, setSignupOtpContext] = useState<{
    email: string;
    payload: SignupPayload;
  } | null>(null);

  const [loginIdentifierRaw, setLoginIdentifierRaw] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginResendSeconds, setLoginResendSeconds] = useState(0);
  const [loginOtpContext, setLoginOtpContext] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const redirect = params.get("redirect");
    if (isValidRedirect(next)) {
      setRedirectPath(next);
      return;
    }
    if (isValidRedirect(redirect)) {
      setRedirectPath(redirect);
    }
  }, []);

  useEffect(() => {
    if (!isHydrating && user) {
      router.replace(redirectPath);
    }
  }, [isHydrating, redirectPath, router, user]);

  useEffect(() => {
    if (signupResendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSignupResendSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [signupResendSeconds]);

  useEffect(() => {
    if (loginResendSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setLoginResendSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [loginResendSeconds]);

  const signupValidation = useMemo(() => {
    const checks = passwordChecks(signupPassword, signupConfirmPassword);
    const name = signupName.trim();
    const email = normalizeEmail(signupEmail);
    const phone = sanitizePhone(signupPhone);

    const valid =
      name.length > 0 &&
      EMAIL_PATTERN.test(email) &&
      PHONE_PATTERN.test(phone) &&
      checks.minLength &&
      checks.uppercase &&
      checks.lowercase &&
      checks.number &&
      checks.special &&
      checks.confirmMatch;

    return {
      valid,
      checks,
      normalizedEmail: email,
      normalizedPhone: phone
    };
  }, [signupConfirmPassword, signupEmail, signupName, signupPassword, signupPhone]);

  const loginIdentifierMode = useMemo(
    () => detectIdentifierMode(loginIdentifierRaw),
    [loginIdentifierRaw]
  );

  const loginIdentifierNormalized = useMemo(() => {
    if (loginIdentifierMode === "email") {
      return normalizeEmail(loginIdentifierRaw);
    }

    const digits = sanitizePhone(loginIdentifierRaw);
    return digits ? `${DEFAULT_LOGIN_COUNTRY_CODE}${digits}` : "";
  }, [loginIdentifierMode, loginIdentifierRaw]);

  const loginIdentifierValid = useMemo(() => {
    if (!loginIdentifierNormalized) {
      return false;
    }

    if (loginIdentifierMode === "email") {
      return EMAIL_PATTERN.test(loginIdentifierNormalized);
    }

    return PHONE_PATTERN.test(loginIdentifierNormalized);
  }, [loginIdentifierMode, loginIdentifierNormalized]);

  const canSubmitSignup = signupValidation.valid && !isSubmitting;
  const canSubmitSignupOtp =
    /^\d{6}$/.test(signupOtp) && !isSubmitting && Boolean(signupOtpContext);
  const canSubmitLoginOtpSend = loginIdentifierValid && !isSubmitting;
  const canSubmitLoginOtp =
    /^\d{6}$/.test(loginOtp) && !isSubmitting && Boolean(loginOtpContext);
  const canSubmitLoginPassword =
    loginIdentifierValid && loginPassword.length > 0 && !isSubmitting;

  function resetFlow(nextMode: AuthMode): void {
    setMode(nextMode);
    setLoginStep("identifier");
    setSignupStep("form");
    setMessage("");
    setIsSubmitting(false);
    setSignupOtp("");
    setLoginOtp("");
    setSignupOtpContext(null);
    setLoginOtpContext(null);
    setSignupResendSeconds(0);
    setLoginResendSeconds(0);
  }

  function setFriendlyAuthError(error: unknown, fallbackMessage: string): void {
    if (error instanceof ApiError) {
      if (error.code === "MOBILE_OTP_COMING_SOON") {
        setMessage("Mobile OTP is coming soon. Please use email OTP or password login.");
        return;
      }

      if (error.code === "USER_NOT_FOUND") {
        setMessage("No account found with these details. Please create an account.");
        return;
      }

      if (error.code === "INVALID_CREDENTIALS") {
        setMessage("Invalid credentials");
        return;
      }

      if (error.code === "OTP_SEND_FAILED") {
        setMessage("Unable to send OTP right now. Please try again.");
        return;
      }

      setMessage(error.message);
      return;
    }

    setMessage(fallbackMessage);
  }

  function handleLoginIdentifierChange(value: string): void {
    if (/[A-Za-z@]/.test(value)) {
      setLoginIdentifierRaw(value);
      return;
    }

    setLoginIdentifierRaw(sanitizePhone(value));
  }

  async function onSignupSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !signupValidation.valid) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const payload: SignupPayload = {
        name: signupName.trim(),
        email: signupValidation.normalizedEmail,
        phone: signupValidation.normalizedPhone,
        password: signupPassword,
        confirmPassword: signupConfirmPassword
      };

      await commerceApi.auth.signupOtpSend<AuthMessageResponse, SignupPayload>(payload);
      setSignupOtpContext({
        email: payload.email,
        payload
      });
      setSignupStep("otp");
      setSignupResendSeconds(RESEND_COOLDOWN_SECONDS);
      setMessage("We sent a verification code to your email.");
    } catch (error) {
      setFriendlyAuthError(error, "Unable to send signup OTP right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSignupResendOtp() {
    if (!signupOtpContext || isSubmitting || signupResendSeconds > 0) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await commerceApi.auth.signupOtpSend<AuthMessageResponse, SignupPayload>(
        signupOtpContext.payload
      );
      setSignupResendSeconds(RESEND_COOLDOWN_SECONDS);
      setMessage("A new verification code was sent to your email.");
    } catch (error) {
      setFriendlyAuthError(error, "Unable to resend OTP right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSignupVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !signupOtpContext || !/^\d{6}$/.test(signupOtp)) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await commerceApi.auth.signupOtpVerify<
        AuthSuccessResponse,
        { email: string; otp: string }
      >({
        email: signupOtpContext.email,
        otp: signupOtp
      });

      completeAuth({
        user: response.data.user,
        accessToken: response.data.accessToken
      });
      setMessage("Signup complete. Redirecting...");
      router.push(redirectPath);
    } catch (error) {
      setFriendlyAuthError(error, "Unable to verify signup OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onLoginSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !loginIdentifierValid) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      if (loginIdentifierMode === "phone") {
        setMessage("We’ll send a verification code to the email linked with this mobile number.");
      }

      await commerceApi.auth.loginOtpSend<AuthMessageResponse, { identifier: string }>({
        identifier: loginIdentifierNormalized
      });
      setLoginOtpContext(loginIdentifierNormalized);
      setLoginStep("otp");
      setLoginResendSeconds(RESEND_COOLDOWN_SECONDS);
      if (loginIdentifierMode !== "phone") {
        setMessage("We sent a verification code to your email.");
      }
    } catch (error) {
      setFriendlyAuthError(error, "Unable to send login OTP right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onLoginResendOtp() {
    if (!loginOtpContext || isSubmitting || loginResendSeconds > 0) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await commerceApi.auth.loginOtpSend<AuthMessageResponse, { identifier: string }>({
        identifier: loginOtpContext
      });
      setLoginResendSeconds(RESEND_COOLDOWN_SECONDS);
      setMessage("A new verification code was sent to your email.");
    } catch (error) {
      setFriendlyAuthError(error, "Unable to resend login OTP right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onLoginVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !loginOtpContext || !/^\d{6}$/.test(loginOtp)) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await commerceApi.auth.loginOtpVerify<
        AuthSuccessResponse,
        { identifier: string; otp: string }
      >({
        identifier: loginOtpContext,
        otp: loginOtp
      });
      completeAuth({
        user: response.data.user,
        accessToken: response.data.accessToken
      });
      setMessage("Login successful. Redirecting...");
      router.push(redirectPath);
    } catch (error) {
      setFriendlyAuthError(error, "Unable to verify login OTP. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onPasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !canSubmitLoginPassword) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await commerceApi.auth.loginPassword<
        AuthSuccessResponse,
        { identifier: string; password: string }
      >({
        identifier: loginIdentifierNormalized,
        password: loginPassword
      });

      completeAuth({
        user: response.data.user,
        accessToken: response.data.accessToken
      });
      setLoginPassword("");
      setMessage("Login successful. Redirecting...");
      router.push(redirectPath);
    } catch (error) {
      setLoginPassword("");
      setFriendlyAuthError(error, "Unable to login with password right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const signupChecks = signupValidation.checks;

  return (
    <section className="relative mx-auto max-w-[420px] overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-b from-[#fffef9] to-white p-6 shadow-[0_30px_80px_rgb(23_33_28_/_12%)] md:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,_rgba(52,122,79,0.15)_0%,_rgba(52,122,79,0)_70%)]"
      />

      <div className="grid grid-cols-2 rounded-2xl bg-[var(--mint)] p-1">
        {(["login", "signup"] as AuthMode[]).map((item) => (
          <button
            className="focus-ring rounded-xl px-4 py-3 text-sm font-semibold transition data-[active=true]:bg-white data-[active=true]:text-[var(--leaf-deep)] data-[active=true]:shadow"
            data-active={mode === item}
            key={item}
            type="button"
            onClick={() => resetFlow(item)}
          >
            {item === "login" ? "Login" : "Signup"}
          </button>
        ))}
      </div>

      <h1 className="mt-7 text-3xl font-semibold leading-tight text-[var(--ink-soft)]">
        {mode === "signup" ? "Create your Auraville account" : "Login to your food world"}
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {mode === "signup"
          ? "We’ll send a verification code to your email."
          : "Use email OTP or password to continue securely."}
      </p>

      {mode === "signup" && signupStep === "form" ? (
        <form className="mt-7 space-y-4" onSubmit={onSignupSendOtp}>
          <label className="block">
            <span className="text-sm font-semibold">Full name</span>
            <Input
              className="mt-2"
              name="name"
              autoComplete="name"
              value={signupName}
              onChange={(event) => setSignupName(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <Input
              className="mt-2"
              name="email"
              type="email"
              autoComplete="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Mobile number</span>
            <Input
              className="mt-2"
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              value={signupPhone}
              onChange={(event) => setSignupPhone(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Password</span>
            <Input
              className="mt-2"
              name="password"
              type="password"
              autoComplete="new-password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Confirm password</span>
            <Input
              className="mt-2"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={signupConfirmPassword}
              onChange={(event) => setSignupConfirmPassword(event.target.value)}
            />
          </label>

          <div className="rounded-xl border border-[var(--line)] bg-[#fcfffc] p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Password rules</p>
            <ul className="mt-2 grid gap-1 text-xs text-[var(--muted)]">
              <li className={signupChecks.minLength ? "text-[var(--leaf)]" : ""}>Minimum 8 characters</li>
              <li className={signupChecks.uppercase ? "text-[var(--leaf)]" : ""}>At least one uppercase letter</li>
              <li className={signupChecks.lowercase ? "text-[var(--leaf)]" : ""}>At least one lowercase letter</li>
              <li className={signupChecks.number ? "text-[var(--leaf)]" : ""}>At least one number</li>
              <li className={signupChecks.special ? "text-[var(--leaf)]" : ""}>At least one special character</li>
              <li className={signupChecks.confirmMatch ? "text-[var(--leaf)]" : ""}>Confirm password must match</li>
            </ul>
          </div>

          <Button className="mt-2 w-full" type="submit" disabled={!canSubmitSignup}>
            {isSubmitting ? "Sending OTP..." : "Create account"}
          </Button>
        </form>
      ) : null}

      {mode === "signup" && signupStep === "otp" && signupOtpContext ? (
        <form className="mt-7 space-y-4" onSubmit={onSignupVerifyOtp}>
          <h2 className="text-xl font-semibold text-[var(--ink-soft)]">Verify your email</h2>
          <p className="text-sm text-[var(--muted)]">
            Code sent to{" "}
            <span className="font-semibold text-[var(--foreground)]">{maskEmail(signupOtpContext.email)}</span>
          </p>
          <label className="block">
            <span className="text-sm font-semibold">Enter 6-digit OTP</span>
            <Input
              className="mt-2 text-base tracking-[0.12em]"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={signupOtp}
              onChange={(event) => setSignupOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto sm:flex-1" type="submit" disabled={!canSubmitSignupOtp}>
              {isSubmitting ? "Verifying..." : "Verify and create account"}
            </Button>
            <Button
              className="w-full sm:w-auto disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[#eff4ef] disabled:text-[var(--muted)] disabled:shadow-none"
              variant="secondary"
              type="button"
              disabled={isSubmitting || signupResendSeconds > 0}
              onClick={() => {
                void onSignupResendOtp();
              }}
            >
              {signupResendSeconds > 0 ? `Resend in ${signupResendSeconds}s` : "Resend OTP"}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "login" && loginStep === "identifier" ? (
        <form className="mt-7 space-y-4 transition-all" onSubmit={onLoginSendOtp}>
          <label className="block">
            <span className="text-sm font-semibold">Enter email or mobile number</span>
            <div className="relative mt-2">
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 flex w-[68px] items-center justify-center rounded-l-lg border-r border-[var(--line)] text-xs font-semibold transition ${
                  loginIdentifierMode === "phone"
                    ? "bg-[var(--mint)] text-[var(--ink-soft)] opacity-100"
                    : "opacity-0"
                }`}
              >
                {DEFAULT_LOGIN_COUNTRY_CODE}
              </div>
              <input
                className={`focus-ring h-12 w-full rounded-lg border border-[var(--line)] bg-white px-4 text-sm text-[var(--foreground)] transition placeholder:text-[#84958a] ${
                  loginIdentifierMode === "phone" ? "pl-[84px]" : ""
                }`}
                name="identifier"
                autoComplete="username"
                inputMode={loginIdentifierMode === "phone" ? "numeric" : "email"}
                placeholder={loginIdentifierMode === "phone" ? "9876543210" : "Enter email or mobile number"}
                value={loginIdentifierMode === "phone" ? sanitizePhone(loginIdentifierRaw) : loginIdentifierRaw}
                onChange={(event) => handleLoginIdentifierChange(event.target.value)}
              />
            </div>
          </label>

          {loginIdentifierMode === "phone" ? (
            <p className="text-xs text-[var(--muted)]">
              We&apos;ll send a verification code to the email linked with this mobile number.
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={!canSubmitLoginOtpSend}>
            {isSubmitting ? "Sending OTP..." : "Send OTP"}
          </Button>
          <button
            className="focus-ring rounded-lg text-sm font-semibold text-[var(--leaf-deep)]"
            type="button"
            onClick={() => {
              setLoginStep("password");
              setMessage("");
            }}
          >
            Use password instead
          </button>
        </form>
      ) : null}

      {mode === "login" && loginStep === "otp" && loginOtpContext ? (
        <form className="mt-7 space-y-4" onSubmit={onLoginVerifyOtp}>
          <h2 className="text-xl font-semibold text-[var(--ink-soft)]">Verify your login</h2>
          <p className="text-sm text-[var(--muted)]">
            Code sent to{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {detectIdentifierMode(loginOtpContext) === "phone"
                ? "your registered email"
                : maskEmail(loginOtpContext)}
            </span>
          </p>
          <label className="block">
            <span className="text-sm font-semibold">Enter 6-digit OTP</span>
            <Input
              className="mt-2 text-base tracking-[0.12em]"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={loginOtp}
              onChange={(event) => setLoginOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto sm:flex-1" type="submit" disabled={!canSubmitLoginOtp}>
              {isSubmitting ? "Verifying..." : "Verify and login"}
            </Button>
            <Button
              className="w-full sm:w-auto disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[#eff4ef] disabled:text-[var(--muted)] disabled:shadow-none"
              variant="secondary"
              type="button"
              disabled={isSubmitting || loginResendSeconds > 0}
              onClick={() => {
                void onLoginResendOtp();
              }}
            >
              {loginResendSeconds > 0 ? `Resend in ${loginResendSeconds}s` : "Resend OTP"}
            </Button>
          </div>

          <button
            className="focus-ring rounded-lg pt-1 text-sm font-semibold text-[var(--leaf-deep)]"
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setLoginStep("password");
              setLoginOtp("");
              setMessage("");
            }}
          >
            Use password instead
          </button>
        </form>
      ) : null}

      {mode === "login" && loginStep === "password" ? (
        <form className="mt-7 space-y-4 transition-all" onSubmit={onPasswordLogin}>
          <label className="block">
            <span className="text-sm font-semibold">Email or mobile</span>
            <Input
              className="mt-2"
              name="identifier"
              autoComplete="username"
              placeholder="you@example.com or +919876543210"
              value={loginIdentifierRaw}
              onChange={(event) => handleLoginIdentifierChange(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Password</span>
            <Input
              className="mt-2"
              name="password"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
            />
          </label>
          <Button className="w-full" type="submit" disabled={!canSubmitLoginPassword}>
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
          <button
            className="focus-ring rounded-lg text-sm font-semibold text-[var(--leaf-deep)]"
            type="button"
            onClick={() => {
              setLoginStep("identifier");
              setMessage("");
            }}
          >
            Use OTP instead
          </button>
        </form>
      ) : null}

      <p className="mt-6 min-h-6 text-sm text-[var(--leaf-deep)]" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
