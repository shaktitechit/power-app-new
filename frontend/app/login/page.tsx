"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, RefreshCw, Lock, Mail } from "lucide-react";

import {
  useInitiateLoginMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
} from "@/store/slices/userApiSlice";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import { ThemeToggle } from "@/components/portal/shared/components/theme-toggle";
import { useCompanyBranding } from "@/components/portal/shared/components/company-branding-provider";
import { DEFAULT_COMPANY_LOGO } from "@/components/portal/lib/companyBranding";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Button } from "@/components/portal/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/portal/ui/input-otp";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { displayName, logoSrc } = useCompanyBranding();

  const [initiateLogin, { isLoading: isInitiating }] = useInitiateLoginMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  // Countdown timer for resend OTP (60 seconds)
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  const handleInitiateLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return;
    }

    try {
      await toastHandler({
        action: async () => {
          const res = await initiateLogin({ email, password }).unwrap();
          setTempToken(res.tempToken);
          setMaskedEmail(res.maskedEmail || email);
          setStep("otp");
          setResendTimer(60);
          setOtp("");
        },
        loading: "Validating credentials...",
        success: "Verification code sent to your email",
      });
    } catch (error) {
      console.error("Login initiation failed", error);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      return;
    }

    try {
      let role = "";
      await toastHandler({
        action: async () => {
          const res = await verifyOtp({ tempToken, otp }).unwrap();
          role = res.role;

          // store user in redux
          dispatch(setCredentials(res));
        },
        loading: "Verifying code...",
        success: "Login successful",
      });

      // redirect after success to role portal specific url
      const slug = role === "super_admin" ? "super-admin" : (role || "");
      router.push(`/${slug}/dashboard`);
    } catch (error) {
      console.error("OTP verification failed", error);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;

    try {
      await toastHandler({
        action: async () => {
          const res = await resendOtp({ tempToken }).unwrap();
          setResendTimer(60);
          setOtp("");
          if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
        },
        loading: "Resending verification code...",
        success: "A new code has been sent to your email",
      });
    } catch (error) {
      console.error("Resend OTP failed", error);
    }
  };

  const handleBackToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setTempToken("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <img
              src={logoSrc}
              alt={displayName}
              className="h-full w-full object-contain p-1"
              onError={(event) => {
                event.currentTarget.src = DEFAULT_COMPANY_LOGO;
              }}
            />
          </div>
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <p className="mt-2 text-muted-foreground">
            {step === "credentials"
              ? "Sign in to your account"
              : "Security Verification"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-lg transition-all duration-300">
          {step === "credentials" ? (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleInitiateLogin();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isInitiating || !email || !password}
                className="w-full"
              >
                {isInitiating ? "Sending OTP..." : "Continue"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold">Enter 6-Digit Code</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a verification code to{" "}
                  <span className="font-medium text-foreground">
                    {maskedEmail}
                  </span>
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyOtp();
                }}
                className="space-y-6 flex flex-col items-center"
              >
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-11 w-11 text-lg" />
                    <InputOTPSlot index={1} className="h-11 w-11 text-lg" />
                    <InputOTPSlot index={2} className="h-11 w-11 text-lg" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-11 w-11 text-lg" />
                    <InputOTPSlot index={4} className="h-11 w-11 text-lg" />
                    <InputOTPSlot index={5} className="h-11 w-11 text-lg" />
                  </InputOTPGroup>
                </InputOTP>

                <Button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="w-full"
                >
                  {isVerifying ? "Verifying..." : "Verify & Sign In"}
                </Button>
              </form>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isResending}
                  className="flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                  {resendTimer > 0 ? `Resend code (${resendTimer}s)` : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          © 2026 Power Audit System
        </p>
      </div>
    </div>
  );
}
