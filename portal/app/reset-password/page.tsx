"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal } = useAuth();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to reset password.");
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="w-full max-w-md bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Invalid Reset Link</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          This password reset link is invalid or incomplete. Please request a fresh reset link from the Sign In dialog.
        </p>
        <div className="pt-2">
          <button
            onClick={() => {
              router.push("/");
              openAuthModal("forgot-password");
            }}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Request New Reset Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-8 shadow-2xl space-y-6">
      {/* Brand & Heading */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex flex-col w-5.5 h-3.5 overflow-hidden rounded-sm shadow-sm">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white flex items-center justify-center">
              <div className="w-1 h-1 rounded-full border border-[#000080]" />
            </div>
            <div className="flex-1 bg-[#138808]" />
          </div>
          <span className="font-extrabold text-sm text-white tracking-tight">
            India District Portal
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-white">Create New Password</h2>
        <p className="text-xs text-gray-400">
          Resetting password for: <span className="font-semibold text-orange-400">{email}</span>
        </p>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-fade-in">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="flex-1 leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {isSuccess ? (
        <div className="py-4 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">Password Reset Successful!</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Your password has been updated. You can now sign in using your new credentials.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                router.push("/");
                openAuthModal("login");
              }}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Sign In Now
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs text-white px-3.5 py-2.5 pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
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

            {/* Live strength indicator */}
            {newPassword && (
              <div className="pt-1.5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">Password strength:</span>
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
            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-xs text-white px-3.5 py-2.5 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shadow-orange-500/10 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Portal Home
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-8 text-center text-gray-400 text-xs">
            Loading reset interface...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
