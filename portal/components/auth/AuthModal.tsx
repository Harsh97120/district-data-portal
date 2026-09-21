"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalView,
    pendingOtpEmail,
    setPendingOtpEmail,
    closeAuthModal,
    setAuthModalView,
    login,
    register,
    verifyOtp,
    resendOtp,
    forgotPassword,
  } = useAuth();

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Register form state
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // OTP form state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResendActive, setIsResendActive] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages on view change
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (authModalView === "otp") {
      setResendCooldown(60);
      setIsResendActive(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [authModalView]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authModalView === "otp" && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setIsResendActive(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authModalView, resendCooldown]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, label: "", color: "bg-gray-700" };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score: 2, label: "Moderate", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(registerPassword);

  // Submit handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginIdentifier.trim()) {
      setErrorMessage("Please enter your username or email.");
      return;
    }
    if (!loginPassword) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });
      if (!res.success) {
        setErrorMessage(res.error || "Failed to sign in.");
        if (res.requiresVerification) {
          setUnverifiedEmail(res.email || loginIdentifier.trim());
        } else {
          setUnverifiedEmail(null);
        }
      } else {
        setUnverifiedEmail(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!registerFirstName.trim()) {
      setErrorMessage("Please enter your first name.");
      return;
    }
    if (!registerLastName.trim()) {
      setErrorMessage("Please enter your last name.");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_.]{3,30}$/;
    if (!usernameRegex.test(registerUsername.trim())) {
      setErrorMessage("Username must be 3–30 characters and can contain letters, numbers, _ and .");
      return;
    }

    if (!registerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (registerPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedUsername = registerUsername.trim().toLowerCase();
      const normalizedEmail = registerEmail.trim().toLowerCase();
      const res = await register({
        firstName: registerFirstName.trim(),
        lastName: registerLastName.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        password: registerPassword,
        confirmPassword: registerConfirmPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create account.");
      } else {
        // Pre-fill login identifier for when user reaches Sign In
        setLoginIdentifier(normalizedUsername || normalizedEmail);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || "";
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pasteData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await verifyOtp({ email: pendingOtpEmail, otp });
      if (!res.success) {
        setErrorMessage(res.error || "Invalid verification code.");
      } else {
        setErrorMessage(null);
        setSuccessMessage(null);
        setAuthModalView("verified-success");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendClick = async () => {
    if (!isResendActive || isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await resendOtp(pendingOtpEmail);
      if (res.success) {
        setSuccessMessage("A fresh verification code has been dispatched.");
        setResendCooldown(60);
        setIsResendActive(false);
      } else {
        setErrorMessage(res.error || "Failed to resend code.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await forgotPassword(forgotEmail);
      if (res.success) {
        setForgotSuccess(true);
      } else {
        setErrorMessage(res.error || "Failed to request password reset.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3.5 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        className="w-full max-w-[620px] rounded-2xl bg-[#1A1D27] border border-[#2D3148] p-5 sm:px-8 sm:py-6 shadow-2xl shadow-black/80 relative my-auto text-[#F0F0F0] max-h-[calc(100vh-2rem)] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header: Logo on left, Close button on right, vertically centered */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#2D3148]/60">
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col w-5.5 h-3.5 overflow-hidden rounded-sm shadow-sm shrink-0">
              <div className="flex-1 bg-[#FF9933]" />
              <div className="flex-1 bg-white flex items-center justify-center">
                <div className="w-1 h-1 rounded-full border border-[#000080]" />
              </div>
              <div className="flex-1 bg-[#138808]" />
            </div>
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              India District Portal
            </span>
          </div>

          <button
            onClick={closeAuthModal}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex flex-col gap-1.5 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
            {unverifiedEmail && authModalView === "login" && (
              <div className="flex items-center justify-between pt-1.5 border-t border-red-500/20 text-[11px]">
                <span className="text-gray-400">Account not verified yet?</span>
                <button
                  type="button"
                  onClick={async () => {
                    setPendingOtpEmail(unverifiedEmail);
                    await resendOtp(unverifiedEmail);
                    setAuthModalView("otp");
                  }}
                  className="text-orange-400 hover:text-orange-300 font-bold underline transition-colors cursor-pointer"
                >
                  Resend verification code →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5 animate-fade-in">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="flex-1 leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* VIEW: LOGIN OR REGISTER */}
        {(authModalView === "login" || authModalView === "register") && (
          <div>
            {/* Tab Navigation: Equal 50/50 width, perfectly aligned active underline */}
            <div className="w-full flex border-b border-[#2D3148] mb-4">
              <button
                type="button"
                onClick={() => {
                  setAuthModalView("login");
                  setErrorMessage(null);
                }}
                className={`flex-1 pb-2.5 text-xs sm:text-sm font-bold text-center transition-colors cursor-pointer relative ${
                  authModalView === "login"
                    ? "text-orange-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Sign In
                {authModalView === "login" && (
                  <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalView("register");
                  setErrorMessage(null);
                }}
                className={`flex-1 pb-2.5 text-xs sm:text-sm font-bold text-center transition-colors cursor-pointer relative ${
                  authModalView === "register"
                    ? "text-orange-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Create Account
                {authModalView === "register" && (
                  <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                )}
              </button>
            </div>

            {/* Google OAuth Button: Matches 100% width of form fields below */}
            <a
              href="/api/auth/google"
              className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] hover:bg-[#202434] border border-[#2D3148] hover:border-gray-600 text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </a>

            {/* Centered Horizontal Divider: balanced lines on both sides, single line text */}
            <div className="flex items-center my-3.5">
              <div className="flex-1 border-t border-[#2D3148]" />
              <span className="px-3 text-[10px] sm:text-[11px] font-bold tracking-widest text-gray-400 uppercase whitespace-nowrap">
                Or with Email
              </span>
              <div className="flex-1 border-t border-[#2D3148]" />
            </div>

            {/* SIGN IN FORM */}
            {authModalView === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. naitikpatel or name@organization.org"
                    className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginIdentifier.includes("@") ? loginIdentifier : "");
                        setAuthModalView("forgot-password");
                      }}
                      className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 pr-10 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="w-8 h-8 flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10.5 sm:h-11 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-sm shadow-orange-500/15 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-3.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>

                <div className="text-center pt-1.5">
                  <p className="text-xs text-gray-400">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalView("register");
                        setErrorMessage(null);
                      }}
                      className="text-orange-400 hover:text-orange-300 font-bold transition-colors cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* REGISTER FORM: Two-column desktop layout for Names & Passwords to completely eliminate vertical scrolling */}
            {authModalView === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Row 1: First Name & Last Name (2 columns on desktop, stacked on mobile) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={registerFirstName}
                      onChange={(e) => setRegisterFirstName(e.target.value)}
                      placeholder="e.g. Naitik"
                      className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={registerLastName}
                      onChange={(e) => setRegisterLastName(e.target.value)}
                      placeholder="e.g. Patel"
                      className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: Username (full width) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="e.g. naitikpatel"
                    className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 transition-colors"
                  />
                  <p className="text-[10.5px] text-gray-400 mt-0.5">
                    3–30 characters (letters, numbers, _ and .)
                  </p>
                </div>

                {/* Row 3: Email Address (full width) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="name@organization.org"
                    className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 transition-colors"
                  />
                </div>

                {/* Row 4: Password & Confirm Password side-by-side on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 pr-10 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="w-8 h-8 flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                      >
                        {showRegisterPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Compact Password Strength Indicator */}
                    {registerPassword && (
                      <div className="pt-0.5 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400">Strength:</span>
                          <span className="font-bold text-gray-300">{strength.label}</span>
                        </div>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : "bg-transparent"} flex-1`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : "bg-transparent"} flex-1`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : "bg-transparent"} flex-1`} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        required
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full h-10.5 sm:h-11 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-3.5 pr-10 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                        className="w-8 h-8 flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                        aria-label={showRegisterConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showRegisterConfirmPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10.5 sm:h-11.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-sm shadow-orange-500/15 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-gray-400">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalView("login");
                        setErrorMessage(null);
                      }}
                      className="text-orange-400 hover:text-orange-300 font-bold transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VIEW: OTP VERIFICATION */}
        {authModalView === "otp" && (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Verify Your Email</h3>
              <p className="text-xs text-gray-400 mt-1">
                We&apos;ve sent a verification code to:
              </p>
              <div className="inline-block mt-1.5 px-3.5 py-1 rounded-full bg-[#0F1117] border border-[#2D3148] text-xs font-semibold text-orange-400 font-mono">
                {maskEmail(pendingOtpEmail)}
              </div>
            </div>

            {/* 6-Digit OTP Box Grid */}
            <form onSubmit={handleOtpSubmit} className="space-y-4 pt-1">
              <div className="flex justify-center gap-2 sm:gap-3">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none rounded-xl text-white transition-colors"
                  />
                ))}
              </div>

              {/* Resend & Expiration */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-gray-400 px-1 pt-1">
                <span className="text-gray-400">Code expires in 5 minutes</span>
                <div className="text-right">
                  <span className="text-gray-400">Didn&apos;t receive the code? </span>
                  {isResendActive ? (
                    <button
                      type="button"
                      onClick={handleResendClick}
                      disabled={isSubmitting}
                      className="text-orange-400 hover:text-orange-300 font-bold transition-colors cursor-pointer underline"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <span className="text-gray-500">
                      Resend in <span className="font-mono text-gray-400">{resendCooldown}s</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Dev Note Hint */}
              <div className="p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/15 text-[11px] text-gray-400 text-left">
                <span className="font-bold text-orange-400">Testing locally?</span> If email server (SMTP) is not configured, the verification OTP is output directly to your terminal console.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpDigits.some((d) => !d)}
                className="w-full h-11 sm:h-12 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-sm shadow-orange-500/15 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify Email</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAuthModalView("register")}
                className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer block mx-auto pt-1"
              >
                ← Back to registration
              </button>
            </form>
          </div>
        )}

        {/* VIEW: EMAIL VERIFIED SUCCESS */}
        {authModalView === "verified-success" && (
          <div className="text-center space-y-5 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/5">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
                <span className="text-emerald-400 font-extrabold">✓</span> Email Verified
              </h3>
              <p className="text-sm text-gray-200">
                Your account has been created successfully.
              </p>
              <p className="text-xs text-gray-400">
                Please sign in to continue.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthModalView("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full h-11 sm:h-12 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs sm:text-sm font-bold transition-all shadow-sm shadow-orange-500/15 active:scale-[0.99] cursor-pointer"
              >
                Continue to Sign In
              </button>
            </div>
          </div>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {authModalView === "forgot-password" && (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto text-orange-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Reset Your Password</h3>
              <p className="text-xs text-gray-400">
                Enter your registered email address and we will dispatch a secure password reset link.
              </p>
            </div>

            {forgotSuccess ? (
              <div className="py-4 text-center space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  A reset link has been dispatched to your email address (valid for 15 minutes). If local development mode is active without SMTP, check your terminal logs.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSuccess(false);
                    setAuthModalView("login");
                  }}
                  className="w-full h-11 sm:h-12 rounded-xl bg-[#0F1117] hover:bg-[#202434] border border-[#2D3148] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@organization.org"
                    className="w-full h-11 sm:h-12 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs sm:text-sm text-white px-4 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 sm:h-12 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-sm shadow-orange-500/15 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthModalView("login")}
                    className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
