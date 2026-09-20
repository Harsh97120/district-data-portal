"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { STATE_BY_CODE } from "@/lib/constants";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import UserAccountMenu, { UserAvatar } from "@/components/layout/UserAccountMenu";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, openAuthModal, logout } = useAuth();

  const [activeStateCode, setActiveStateCode] = useState("");
  const [activeStateName, setActiveStateName] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const parts = path.split("/");
      let code = "";
      if (parts[1] === "state" && parts[2]) {
        code = parts[2].toUpperCase();
      } else if (parts[1] === "district" && parts[2]) {
        const decoded = decodeURIComponent(parts[2]);
        code = decoded.split("-")[0].toUpperCase();
      }

      if (code) {
        setActiveStateCode(code);
        const stateInfo = STATE_BY_CODE[code];
        setActiveStateName(stateInfo?.name || code);
      } else {
        setActiveStateCode("");
        setActiveStateName("");
      }
    }
  }, [pathname]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0F1117]/85 backdrop-blur-md border-b border-[#2D3148] shadow-sm shadow-black/5"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex flex-col w-5.5 h-3.5 overflow-hidden rounded-sm shadow-sm">
                <div className="flex-1 bg-[#FF9933]" />
                <div className="flex-1 bg-white flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full border border-[#000080]" />
                </div>
                <div className="flex-1 bg-[#138808]" />
              </div>
              <span className="font-extrabold text-base text-white tracking-tight group-hover:text-orange-400 transition-colors">
                India District Portal
              </span>
            </Link>

            {/* Desktop Nav Links & Auth Button */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-2">
                <Link
                  href="/"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                    pathname === "/"
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      : "text-gray-400 hover:text-white border border-transparent"
                  }`}
                >
                  Home
                </Link>
                <Link
                  href="/map"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                    pathname === "/map"
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      : "text-gray-400 hover:text-white border border-transparent"
                  }`}
                >
                  Map Explorer
                </Link>
                <Link
                  href="/search"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                    pathname === "/search"
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      : "text-gray-400 hover:text-white border border-transparent"
                  }`}
                >
                  Search & Filter
                </Link>
                {activeStateName && activeStateCode && (
                  <Link
                    href={`/state/${activeStateCode}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide bg-orange-500/5 text-orange-400 border border-orange-500/15 hover:bg-orange-500/10 transition-all duration-200"
                  >
                    State: {activeStateName}
                  </Link>
                )}
                <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-[10px] font-bold tracking-wide ml-2 uppercase">
                  NFHS-5 Data
                </span>
              </nav>

              <div className="w-px h-5 bg-[#2D3148]" />

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className="p-1.5 rounded-xl border border-[#2D3148] hover:border-orange-500/50 bg-[#1A1D27]/50 text-gray-400 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  {theme === "dark" ? (
                    <span className="text-[13px] leading-none select-none">☀️</span>
                  ) : (
                    <span className="text-[13px] leading-none select-none">🌙</span>
                  )}
                </button>

                {/* Authenticated User Menu or Sign In Button */}
                {user ? (
                  <UserAccountMenu user={user} logout={logout} />
                ) : (
                  <button
                    onClick={() => openAuthModal("login")}
                    className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition-all shadow-sm shadow-orange-500/10 active:scale-[0.98] cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div className="md:hidden border-t border-[#2D3148] py-3 space-y-2 animate-fade-in">
              {user && (
                <div className="p-3 rounded-2xl bg-[#161822] border border-[#2D3148] mx-2 mb-2 flex items-center gap-3">
                  <UserAvatar user={user} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {user.name || user.email.split("@")[0]}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{user.email}</p>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      {user.emailVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Verified
                        </span>
                      )}
                      {user.provider === "google" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                          Google
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Home
              </Link>
              <Link
                href="/map"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Map Explorer
              </Link>
              <Link
                href="/search"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Search & Filter
              </Link>
              {activeStateName && activeStateCode && (
                <Link
                  href={`/state/${activeStateCode}`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {activeStateName}
                </Link>
              )}

              <div className="h-px bg-[#2D3148] my-2 mx-4" />

              <div className="px-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="flex-1 py-2 text-center text-xs font-semibold rounded-xl bg-[#1A1D27] border border-[#2D3148] text-white hover:bg-[#242838] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {theme === "dark" ? (
                    <>
                      <span>☀️</span> Light Mode
                    </>
                  ) : (
                    <>
                      <span>🌙</span> Dark Mode
                    </>
                  )}
                </button>

                {user ? (
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="flex-1 text-center py-2 text-xs font-semibold rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      openAuthModal("login");
                      setMenuOpen(false);
                    }}
                    className="flex-1 text-center py-2 text-xs font-semibold rounded-xl bg-orange-500 hover:bg-orange-400 text-white cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Global Production Auth Modal */}
      <AuthModal />
    </>
  );
}
