"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { STATE_BY_CODE } from "@/lib/constants";
import { useTheme } from "@/lib/ThemeContext";

type AuthMode = "login" | "register" | null;

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
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

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setAuthMode(null);
      setIsSuccess(false);
      setEmail("");
      setPassword("");
      setName("");
    }, 1500);
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0F1117]/85 backdrop-blur-md border-b border-[#2D3148] shadow-sm shadow-black/5' : 'bg-transparent border-b border-transparent'}`}>
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

            {/* Desktop Nav Links & Single Auth Option */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-2">
                <Link href="/" className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${pathname === "/" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-gray-400 hover:text-white border border-transparent"}`}>
                  Home
                </Link>
                <Link href="/map" className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${pathname === "/map" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-gray-400 hover:text-white border border-transparent"}`}>
                  Map Explorer
                </Link>
                <Link href="/search" className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${pathname === "/search" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-gray-400 hover:text-white border border-transparent"}`}>
                  Search & Filter
                </Link>
                {activeStateName && activeStateCode && (
                  <Link href={`/state/${activeStateCode}`} className="px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide bg-orange-500/5 text-orange-400 border border-orange-500/15 hover:bg-orange-500/10 transition-all duration-200">
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
                <button
                  onClick={() => setAuthMode("login")}
                  className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition-all shadow-sm shadow-orange-500/10 active:scale-[0.98] cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
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
            <div className="md:hidden border-t border-[#2D3148] py-3 space-y-2">
              <Link href="/" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Home
              </Link>
              <Link href="/map" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Map Explorer
              </Link>
              <Link href="/search" onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Search & Filter
              </Link>
              {activeStateName && activeStateCode && (
                <Link href={`/state/${activeStateCode}`} onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  {activeStateName}
                </Link>
              )}
              <div className="h-px bg-[#2D3148] my-2 mx-4" />
              <div className="px-4 flex items-center gap-3">
                <button
                  onClick={() => { toggleTheme(); }}
                  className="flex-1 py-2 text-center text-xs font-semibold rounded-xl bg-[#1A1D27] border border-[#2D3148] text-white hover:bg-[#242838] flex items-center justify-center gap-1.5"
                >
                  {theme === "dark" ? (
                    <><span>☀️</span> Light Mode</>
                  ) : (
                    <><span>🌙</span> Dark Mode</>
                  )}
                </button>
                <button
                  onClick={() => { setAuthMode("login"); setMenuOpen(false); }}
                  className="flex-1 text-center py-2 text-xs font-semibold rounded-xl bg-[#1A1D27] border border-[#2D3148] text-white hover:bg-[#242838]"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modal Overlay */}
      {authMode && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1A1D27] border border-[#2D3148] p-6 shadow-2xl animate-fade-in relative"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              onClick={() => setAuthMode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {isSuccess ? (
              <div className="py-8 text-center space-y-4 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-[#66BB6A]/10 border border-[#66BB6A]/30 flex items-center justify-center mx-auto text-[#66BB6A]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">
                  {authMode === "login" ? "Signed In Successfully!" : "Registration Complete!"}
                </h3>
                <p className="text-xs text-gray-400">Loading your personalized district dashboard...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tabs for Sign In vs Register inside the Modal */}
                <div className="flex border-b border-[#2D3148] mb-4">
                  <button
                    type="button"
                    onClick={() => { setAuthMode("login"); setIsSuccess(false); }}
                    className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                      authMode === "login"
                        ? "border-orange-500 text-orange-400"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("register"); setIsSuccess(false); }}
                    className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                      authMode === "register"
                        ? "border-orange-500 text-orange-400"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Register
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authMode === "register" && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:outline-none text-xs text-white px-3.5 py-2.5"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@organization.org"
                      className="w-full rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:outline-none text-xs text-white px-3.5 py-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:outline-none text-xs text-white px-3.5 py-2.5"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-colors mt-2"
                  >
                    {authMode === "login" ? "Sign In" : "Register"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
