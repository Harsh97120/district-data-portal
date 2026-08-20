import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "India District Data Portal — Demographic & Socio-Economic Intelligence",
  description:
    "Explore comprehensive district-level demographic, health, literacy, and developmental indicators from NFHS-5 across all Indian districts via interactive maps or direct search.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 pb-16">

      {/* ── 1. Hero & Portal Introduction Section ── */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-10 md:py-16 border-b border-[#2D3148] bg-gradient-to-b from-[#141722] via-[#0F1117] to-[#0F1117] overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            National Family Health Survey · NFHS-5 (2019–21)
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight max-w-4xl mx-auto">
            India District{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">
              Data & Intelligence Portal
            </span>
          </h1>

          {/* Introductory Overview */}
          <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            A centralized data platform providing district-level insights across all <strong>36 States & Union Territories</strong> of India. Explore over <strong>131 demographic, healthcare, education, nutrition, gender, and socio-economic indicators</strong> derived from government surveys and enriched with AI/ML development intelligence.
          </p>

          {/* Key Metric Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {[
              { label: "States & UTs", value: "36", icon: "🏛️" },
              { label: "Districts Covered", value: "700+", icon: "📍" },
              { label: "Survey Indicators", value: "131+", icon: "📊" },
              { label: "Survey Cycle", value: "NFHS-5 / NFHS-6", icon: "📋" },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#1A1D27]/80 border border-[#2D3148] text-xs shadow-sm hover:border-orange-500/30 transition-colors"
              >
                <span className="text-sm">{icon}</span>
                <div className="text-left">
                  <span className="text-white font-bold block">{value}</span>
                  <span className="text-gray-400 text-[11px]">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,107,53,0.15),rgba(255,255,255,0))]" />
      </section>

      {/* ── 2. Two Navigation Portals / Sections ── */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 space-y-10">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">
            Two Ways to Explore
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Choose Your Preferred Exploration Method
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm">
            Select visual map navigation to explore geographically, or use manual search & filtering to jump directly to specific districts. Both pathways connect to the same comprehensive district intelligence dashboards.
          </p>
        </div>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ═════════════════════════════════════════════════════════════════
              SECTION 1: MAP-BASED NAVIGATION CARD
             ═════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col justify-between rounded-2xl bg-[#1A1D27] border border-[#2D3148] p-7 shadow-xl hover:border-orange-500/50 transition-all group relative overflow-hidden">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400" />

            <div className="space-y-5">
              {/* Icon & Badge Header */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🗺️
                </div>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  Method 1 · Visual Map
                </span>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                  Interactive Map Navigation
                </h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Explore district data geographically via interactive boundary maps. Select any state on India&apos;s map to drill down into district boundaries, examine demographic choropleths, and click districts to inspect statistics.
                </p>
              </div>

              {/* Feature Highlights */}
              <ul className="space-y-2.5 pt-2 border-t border-[#2D3148] text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold mt-0.5">✓</span>
                  <span><strong>Full India Map:</strong> Interactive state boundary map with instant zoom and reset.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold mt-0.5">✓</span>
                  <span><strong>District Drill-Down:</strong> Click states to open state-level district maps with literacy choropleth.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold mt-0.5">✓</span>
                  <span><strong>Slide-In District Panel:</strong> Click any district boundary to view instant statistics and open the full district page.</span>
                </li>
              </ul>
            </div>

            {/* Redirect CTA Button */}
            <div className="pt-6 mt-6 border-t border-[#2D3148]">
              <Link
                href="/map"
                className="w-full py-3.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] group-hover:shadow-orange-500/25"
              >
                <span>Launch Interactive Map Explorer</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              SECTION 2: MANUAL SEARCH & FILTER DIRECTORY CARD
             ═════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col justify-between rounded-2xl bg-[#1A1D27] border border-[#2D3148] p-7 shadow-xl hover:border-emerald-500/50 transition-all group relative overflow-hidden">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

            <div className="space-y-5">
              {/* Icon & Badge Header */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🔍
                </div>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Method 2 · Manual Filter
                </span>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Search & Filter Directory
                </h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Search and filter districts manually using state and district dropdowns, quick search, or tabular browsing. Perfect for users who know the district name and want instant access without navigating a map.
                </p>
              </div>

              {/* Feature Highlights */}
              <ul className="space-y-2.5 pt-2 border-t border-[#2D3148] text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span><strong>Cascading Selectors:</strong> Pick state and district with instant preview of key demographics.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span><strong>Instant Search:</strong> Live filter across 700+ districts by name or state code.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                  <span><strong>Direct Report Access:</strong> One-click navigation straight into the district&apos;s full intelligence report.</span>
                </li>
              </ul>
            </div>

            {/* Redirect CTA Button */}
            <div className="pt-6 mt-6 border-t border-[#2D3148]">
              <Link
                href="/search"
                className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-all active:scale-[0.98] group-hover:shadow-emerald-600/25"
              >
                <span>Open Search & Filter Directory</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

        </div>

        {/* ── 3. Bottom Information Banner ── */}
        <div className="p-6 rounded-2xl bg-[#141722] border border-[#2D3148] flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3.5">
            <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">
              🎯
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">
                Unified Destination for Every District
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Whether you select a district from the interactive map or find it via manual search, you get the exact same rich demographic indicators, ML cluster insights, and AI query engine.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/state/GJ"
              className="px-3.5 py-2 rounded-xl bg-[#1A1D27] hover:bg-[#242838] border border-[#2D3148] text-xs text-gray-300 hover:text-white font-medium transition-colors"
            >
              Sample: Gujarat Map →
            </Link>
            <Link
              href="/district/GJ-Ahmedabad"
              className="px-3.5 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs text-orange-400 font-semibold transition-colors"
            >
              Sample: Ahmedabad Dashboard →
            </Link>
          </div>
        </div>

      </section>

    </div>
  );
}
