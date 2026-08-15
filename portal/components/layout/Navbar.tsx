"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F1117]/90 backdrop-blur-md border-b border-[#2D3148]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* India flag mini icon */}
            <div className="flex flex-col w-6 h-4 overflow-hidden rounded-sm shadow-sm">
              <div className="flex-1 bg-[#FF9933]" />
              <div className="flex-1 bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full border border-[#000080]" />
              </div>
              <div className="flex-1 bg-[#138808]" />
            </div>
            <span className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">
              India District Portal
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/state/GJ" className="hover:text-white transition-colors">
              Gujarat
            </Link>
            <span className="px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-full text-xs font-medium">
              NFHS-5 Data
            </span>
          </nav>

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
          <div className="md:hidden border-t border-[#2D3148] py-3 space-y-1">
            <Link href="/" onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Home
            </Link>
            <Link href="/state/GJ" onClick={() => setMenuOpen(false)}
              className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Gujarat
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
