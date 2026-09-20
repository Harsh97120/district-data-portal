"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SafeUser } from "@/lib/models/user";

export type AuthModalView = "login" | "register" | "otp" | "forgot-password";

interface AuthContextType {
  user: SafeUser | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  pendingOtpEmail: string;
  setPendingOtpEmail: (email: string) => void;
  openAuthModal: (view?: AuthModalView, email?: string) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  login: (credentials: { identifier?: string; email?: string; password: string }) => Promise<{
    success: boolean;
    error?: string;
    requiresVerification?: boolean;
    email?: string;
  }>;
  register: (data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    requiresVerification?: boolean;
    email?: string;
  }>;
  verifyOtp: (data: { email: string; otp: string }) => Promise<{
    success: boolean;
    error?: string;
    user?: SafeUser;
  }>;
  resendOtp: (email: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  resetPassword: (data: {
    email: string;
    token: string;
    newPassword: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>("login");
  const [pendingOtpEmail, setPendingOtpEmail] = useState("");

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn("Session check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle URL query parameters on initial page load (e.g. from Google OAuth callback)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("auth_success")) {
        checkAuth();
        // Clean URL without refresh
        url.searchParams.delete("auth_success");
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
      }
    }
  }, [checkAuth]);

  const openAuthModal = useCallback((view: AuthModalView = "login", email?: string) => {
    setAuthModalView(view);
    if (email) setPendingOtpEmail(email);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const login = async (credentials: { identifier?: string; email?: string; password: string }) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: credentials.identifier || credentials.email,
          password: credentials.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification) {
          setPendingOtpEmail(data.email || credentials.email || credentials.identifier || "");
          setAuthModalView("otp");
          return {
            success: false,
            error: data.error,
            requiresVerification: true,
            email: data.email || credentials.email || credentials.identifier,
          };
        }
        return { success: false, error: data.error || "Failed to sign in." };
      }

      if (data.user) {
        setUser(data.user);
        closeAuthModal();
      }

      return { success: true };
    } catch (error) {
      console.error("Login request error:", error);
      return { success: false, error: "Network error occurred. Please try again." };
    }
  };

  const register = async (userData: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Failed to create account." };
      }

      setPendingOtpEmail(data.email || userData.email);
      setAuthModalView("otp");

      return {
        success: true,
        requiresVerification: true,
        email: data.email || userData.email,
      };
    } catch (error) {
      console.error("Register request error:", error);
      return { success: false, error: "Network error occurred. Please try again." };
    }
  };

  const verifyOtp = async ({ email, otp }: { email: string; otp: string }) => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Invalid verification code." };
      }

      if (data.user) {
        setUser(data.user);
        closeAuthModal();
      }

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Verify OTP error:", error);
      return { success: false, error: "Network error occurred. Please try again." };
    }
  };

  const resendOtp = async (email: string) => {
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Failed to resend code." };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error("Resend OTP error:", error);
      return { success: false, error: "Network error occurred. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout request error:", error);
    } finally {
      setUser(null);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Failed to request password reset." };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error("Forgot password request error:", error);
      return { success: false, error: "Network error occurred. Please try again." };
    }
  };

  const resetPassword = async (data: { email: string; token: string; newPassword: string }) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        return { success: false, error: responseData.error || "Failed to reset password." };
      }

      return { success: true, message: responseData.message };
    } catch (error) {
      console.error("Reset password request error:", error);
      return { success: false, error: "Network error occurred. Please try again." };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        authModalView,
        pendingOtpEmail,
        setPendingOtpEmail,
        openAuthModal,
        closeAuthModal,
        setAuthModalView,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        forgotPassword,
        resetPassword,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
