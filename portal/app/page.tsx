import type { Metadata } from "next";
import Link from "next/link";
import LiveDataBackground from "@/components/ui/LiveDataBackground";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import MagneticStatCard from "@/components/ui/MagneticStatCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import ScrollIndicator from "@/components/ui/ScrollIndicator";

export const metadata: Metadata = {
  title: "India District Data Portal — Demographic & Socio-Economic Intelligence",
  description:
    "Explore comprehensive district-level demographic, health, literacy, and developmental indicators from NFHS-5 across all Indian districts via interactive maps or direct search.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 pb-16 relative overflow-hidden bg-[#0F1117]">

      {/* ── 1. Hero & Portal Introduction Section ── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-20 border-b border-[#2D3148] overflow-hidden flex flex-col items-center justify-center">
        {/* Canvas Live Grid Background */}
        <LiveDataBackground />
        
        {/* Fallback CSS Grid pattern */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        
        {/* Glow Accent */}
        <div className="glow-accent" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          {/* Badge */}
          <div className="animate-premium-fade-up delay-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse shadow-[0_0_8px_#ff6b35]" />
            National Family Health Survey · NFHS-5 (2019–21)
          </div>

          {/* Title */}
          <h1 className="animate-premium-fade-up delay-100 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] max-w-3xl mx-auto">
            India District<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 shimmer-text">
              Data & Intelligence
            </span>{" "}
            Portal
          </h1>

          {/* Introductory Overview */}
          <p className="animate-premium-fade-up delay-200 text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            An analytical dashboard delivering granular socio-economic intelligence across all <strong>36 States & Union Territories</strong> of India. Utilizing advanced data processing and predictive ML modeling, the portal unlocks insights into public health, education patterns, and gender parity indicators from the NFHS-5 survey cycle.
          </p>

          {/* Key Metric Highlights */}
          <div className="animate-premium-fade-up delay-300 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto w-full">
            {/* Stat Card 1 */}
            <MagneticStatCard>
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-5 h-5 animate-icon-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 22V10m0 12h16m-16 0h-2m18 0h2m-2-12v12M12 2v8M8 6h8M2 10h20M7 10v12M17 10v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  <AnimatedCounter target={36} />
                </span>
                <span className="text-gray-400 text-[10px] font-bold block mt-1.5 leading-snug uppercase tracking-wider">
                  STATES & UTS REGISTERED
                </span>
              </div>
            </MagneticStatCard>

            {/* Stat Card 2 */}
            <MagneticStatCard>
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-5 h-5 animate-icon-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  <AnimatedCounter target={700} suffix="+" />
                </span>
                <span className="text-gray-400 text-[10px] font-bold block mt-1.5 leading-snug uppercase tracking-wider">
                  TOTAL DISTRICTS COVERED
                </span>
              </div>
            </MagneticStatCard>

            {/* Stat Card 3 */}
            <MagneticStatCard>
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round" className="animate-icon-bar-1 origin-bottom transition-transform duration-300" />
                  <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round" className="animate-icon-bar-2 origin-bottom transition-transform duration-300" />
                  <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round" className="animate-icon-bar-3 origin-bottom transition-transform duration-300" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  <AnimatedCounter target={131} suffix="+" />
                </span>
                <span className="text-gray-400 text-[10px] font-bold block mt-1.5 leading-snug uppercase tracking-wider">
                  SURVEY INDICATORS
                </span>
              </div>
            </MagneticStatCard>

            {/* Stat Card 4 */}
            <MagneticStatCard>
              <div className="relative overflow-hidden w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="17" x2="13" y2="17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* Scanner laser overlay bar */}
                <div className="absolute left-1 right-1 h-[1.5px] bg-[#FF6B35] shadow-[0_0_4px_#FF6B35] animate-doc-scan" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  NFHS-5 / NFHS-6
                </span>
                <span className="text-gray-400 text-[10px] font-bold block mt-1.5 leading-snug uppercase tracking-wider">
                  ACTIVE DATASET CYCLE
                </span>
              </div>
            </MagneticStatCard>
          </div>
        </div>

        {/* Scroll mouse indicator */}
        <ScrollIndicator />
      </section>

      {/* ── 2. Two Navigation Portals / Sections ── */}
      <section id="explore-section" className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-12">

        {/* Section Header */}
        <ScrollReveal delay={50}>
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-orange-500/5 px-3 py-1 rounded-full border border-orange-500/10">
              Two Ways to Explore
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Choose Your Preferred Exploration Method
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xl mx-auto">
              Select visual map navigation to explore geographically, or use manual search & filtering to jump directly to specific districts. Both pathways connect to the same comprehensive district intelligence dashboards.
            </p>
          </div>
        </ScrollReveal>

        {/* Interactive Visual Separator: DATA ──→ ENGINE ──→ INSIGHT */}
        <ScrollReveal delay={150}>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-4 max-w-2xl mx-auto text-gray-500 text-[10px] font-extrabold tracking-wider uppercase select-none">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27]/60 border border-[#2D3148] text-white/95 shadow-sm">
              Government Data
            </div>
            
            {/* Animated Line 1 */}
            <div className="relative w-20 h-1 hidden md:block overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-[#2D3148] rounded-full" />
              <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-transparent via-[#FF6B35] to-transparent rounded-full animate-trail-h" />
            </div>
            
            <div className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27]/60 border border-[#2D3148] text-orange-400 shadow-sm">
              Intelligence Engine
            </div>
            
            {/* Animated Line 2 */}
            <div className="relative w-20 h-1 hidden md:block overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-[#2D3148] rounded-full" />
              <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full animate-trail-h" style={{ animationDelay: "1.7s" }} />
            </div>
            
            <div className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27]/60 border border-[#2D3148] text-emerald-400 shadow-sm">
              ML + LLM Insights
            </div>
          </div>
        </ScrollReveal>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* SECTION 1: MAP-BASED NAVIGATION CARD */}
          <ScrollReveal delay={200}>
            <div className="flex flex-col justify-between rounded-2xl bg-[#1A1D27]/90 border border-[#2D3148] p-8 shadow-xl hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(255,107,53,0.04)] transition-all duration-300 group relative overflow-hidden h-full">
              {/* Top decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400" />

              <div className="space-y-6">
                {/* Icon & Badge Header */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-300">
                    🗺️
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    Method 1 · Visual Map
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    Interactive Map Explorer
                  </h3>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Navigate demographic variables geographically via interactive GIS boundary maps. Zoom into individual states to examine literacy choropleths, spatial distributions, and district-level micro-data panels.
                  </p>
                </div>

                {/* Feature Highlights */}
                <ul className="space-y-3 pt-4 border-t border-[#2D3148] text-xs text-gray-300">
                  <li className="flex items-start gap-2.5">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>
                    <span><strong>GIS Boundary Mapping:</strong> Interactive maps rendered with automatic zoom controls and resets.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>
                    <span><strong>Choropleth Visualizer:</strong> Render indicators across states using dynamically scaled colors.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-orange-400 font-bold mt-0.5">✓</span>
                    <span><strong>Side-Panel Summary:</strong> Display comprehensive district parameters instantly upon border click.</span>
                  </li>
                </ul>
              </div>

              {/* Redirect CTA Button */}
              <div className="pt-6 mt-8 border-t border-[#2D3148]">
                <Link
                  href="/map"
                  className="w-full py-3.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] group-hover:shadow-orange-500/25 cursor-pointer"
                >
                  <span>Launch Interactive Map Explorer</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* SECTION 2: MANUAL SEARCH & FILTER DIRECTORY CARD */}
          <ScrollReveal delay={300}>
            <div className="flex flex-col justify-between rounded-2xl bg-[#1A1D27]/90 border border-[#2D3148] p-8 shadow-xl hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.04)] transition-all duration-300 group relative overflow-hidden h-full">
              {/* Top decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

              <div className="space-y-6">
                {/* Icon & Badge Header */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-300">
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
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Query the district database directly using cascading drop-downs, keyword searches, and parameter filtering. Instantly compile comparative reports and jump directly to district intelligence sheets.
                  </p>
                </div>

                {/* Feature Highlights */}
                <ul className="space-y-3 pt-4 border-t border-[#2D3148] text-xs text-gray-300">
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <span><strong>Cascading Drop-downs:</strong> Fast selectors map state listings to target district identifiers.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <span><strong>Tabular Quick Filter:</strong> Look up metrics across 700+ rows instantly by typing.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                    <span><strong>Deep Report Anchoring:</strong> Navigate straight into full ML cluster and analytical layouts.</span>
                  </li>
                </ul>
              </div>

              {/* Redirect CTA Button */}
              <div className="pt-6 mt-8 border-t border-[#2D3148]">
                <Link
                  href="/search"
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-all active:scale-[0.98] group-hover:shadow-emerald-600/25 cursor-pointer"
                >
                  <span>Open Search & Filter Directory</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </ScrollReveal>

        </div>

        {/* ── 3. Bottom Information Banner ── */}
        <ScrollReveal delay={400}>
          <div className="p-6 rounded-2xl bg-[#141722]/80 border border-[#2D3148] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left shadow-md">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">
                🎯
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Unified District Intelligence Engine
                </h4>
                <p className="text-xs text-gray-400 mt-1 leading-normal max-w-xl">
                  Both visual mapping and database queries route directly to the identical comparative analysis engine, containing over 130 standardized survey variables, cluster metrics, and LLM reasoning features.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto justify-center">
              <Link
                href="/state/GJ"
                className="px-4 py-2.5 rounded-xl bg-[#1A1D27] hover:bg-[#242838] border border-[#2D3148] text-xs text-gray-300 hover:text-white font-medium transition-colors cursor-pointer"
              >
                Sample: Gujarat Map →
              </Link>
              <Link
                href="/district/GJ-Ahmedabad"
                className="px-4 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs text-orange-400 font-semibold transition-colors cursor-pointer"
              >
                Sample: Ahmedabad Dashboard →
              </Link>
            </div>
          </div>
        </ScrollReveal>

      </section>

    </div>
  );
}
