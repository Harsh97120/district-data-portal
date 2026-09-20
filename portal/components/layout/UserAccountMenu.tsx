"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { SafeUser } from "@/lib/models/user";

interface UserAccountMenuProps {
  user: SafeUser;
  logout: () => Promise<void>;
}

/**
 * Robust User Avatar with automatic Google referrer policy handling
 * and instant fallback to initials or user icon on load error.
 */
function UserAvatar({
  user,
  size = "sm",
  className = "",
}: {
  user: SafeUser;
  size?: "sm" | "lg";
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  // Compute initials safely
  const getInitials = (): string => {
    if (user.name) {
      const parts = user.name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].slice(0, 2).toUpperCase();
      }
      if (parts.length === 1 && parts[0].length === 1) {
        return parts[0].toUpperCase();
      }
    }
    if (user.email) {
      const namePart = user.email.split("@")[0];
      return namePart.slice(0, 2).toUpperCase();
    }
    return "";
  };

  const initials = getInitials();
  const sizeClasses =
    size === "lg"
      ? "w-11 h-11 text-sm ring-2 ring-orange-500/25"
      : "w-7 h-7 text-[11px] ring-1 ring-white/15";

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold select-none transition-transform duration-200 shadow-sm ${sizeClasses} ${className}`}
    >
      {user.image && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt={user.name || "User profile photo"}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center text-white">
          {initials ? (
            <span className="leading-none tracking-wider font-bold">{initials}</span>
          ) : (
            <svg
              className="w-1/2 h-1/2 text-white/90"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserAccountMenu({ user, logout }: UserAccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Clean formatted name
  const displayName =
    user.name ||
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "") ||
    (user.username ? `@${user.username}` : "") ||
    user.email.split("@")[0] ||
    "User";

  return (
    <div className="relative" ref={menuRef}>
      {/* 1. TOP-RIGHT USER TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User account menu"
        className="flex items-center gap-2 p-1 pr-2.5 rounded-full bg-[#1A1D27]/80 hover:bg-[#1A1D27] border border-[#2D3148] hover:border-orange-500/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-orange-500/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500/40"
      >
        {/* Avatar */}
        <UserAvatar user={user} size="sm" />

        {/* User Name: hidden on mobile/small screens, truncated on desktop */}
        <span className="hidden md:inline-block text-xs font-semibold text-gray-200 group-hover:text-white max-w-[130px] truncate transition-colors">
          {displayName}
        </span>

        {/* Chevron Icon */}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-200 transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180 text-orange-400" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* 2. PROFILE DROPDOWN MENU */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#161822]/95 backdrop-blur-xl border border-[#2D3148] shadow-2xl shadow-black/60 py-3 z-50 text-[#F0F0F0] transform origin-top-right transition-all duration-200 animate-fade-in"
        >
          {/* Header Area */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white tracking-tight truncate">
                  {displayName}
                </p>
                {user.username && (
                  <p className="text-xs font-mono font-medium text-orange-400/90 truncate">
                    @{user.username}
                  </p>
                )}
                <p
                  className="text-xs text-gray-400 truncate mt-0.5"
                  title={user.email}
                >
                  {user.email}
                </p>
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex items-center flex-wrap gap-2 mt-3 pt-1">
              {/* Verified Status Badge (only if verified) */}
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <svg
                    className="w-3 h-3 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Verified</span>
                </span>
              )}

              {/* Provider Badge */}
              {user.provider === "google" ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
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
                  <span>Google</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                  <svg
                    className="w-3 h-3 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Email Account</span>
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#2D3148]/80 my-1 mx-3" />

          {/* Functional Navigation Links */}
          <div className="py-1 px-2 space-y-0.5">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2.5 group"
            >
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition-colors shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">Portal Home</span>
              </div>
            </Link>

            <Link
              href="/map"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2.5 group"
            >
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition-colors shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">Map Explorer</span>
              </div>
            </Link>

            <Link
              href="/search"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2.5 group"
            >
              <svg
                className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition-colors shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">Search & Indicators</span>
              </div>
            </Link>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#2D3148]/80 my-1 mx-3" />

          {/* Sign Out Button */}
          <div className="pt-1 px-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer group"
            >
              <svg
                className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { UserAvatar };
