import type { Metadata } from "next";
import Link from "next/link";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import MagneticStatCard from "@/components/ui/MagneticStatCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { fetchDistrictsIndex } from "@/lib/data-loader";
import { METRIC_LABELS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "India District Data Portal — Demographic & Socio-Economic Intelligence",
  description:
    "Explore comprehensive district-level demographic, health, literacy, and developmental indicators from NFHS-5 across all Indian districts via interactive maps or direct search.",
};

export default async function HomePage() {
  const districts = await fetchDistrictsIndex();
  const districtCount = districts.length > 0 ? districts.length : null;
  const stateCount = districts.length > 0 ? new Set(districts.map((d) => d.state_code)).size : null;
  const indicatorCount = Object.keys(METRIC_LABELS).length > 0 ? Object.keys(METRIC_LABELS).length : null;

  return (
    <div className="flex flex-col flex-1 pb-16 relative overflow-hidden bg-[#0F1117]">

      {/* ── 1. Hero & Portal Introduction Section ── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-20 border-b border-[#2D3148] overflow-hidden flex flex-col items-center justify-center">
        {/* Fallback CSS Grid pattern */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        {/* Glow Accent */}
        <div className="glow-accent" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          {/* Badge */}
          <div className="animate-premium-fade-up delay-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] sm:text-xs font-medium tracking-wide mb-2 max-w-full text-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] flex-shrink-0" />
            <span>National Family Health Survey · NFHS-5 (2019–21) & NFHS-6 (2023–24)</span>
          </div>

          {/* Title */}
          <h1 className="animate-premium-fade-up delay-100 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.12] max-w-3xl mx-auto">
            India District<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-300 shimmer-text">
              Data Portal
            </span>
          </h1>

          {/* Introductory Overview */}
          <p className="animate-premium-fade-up delay-200 text-gray-300/90 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            This website helps you explore district-level data on health, nutrition, women and children. Search for indicators, compare districts, and see how a district compares with its state.
          </p>

          {/* Key Metric Highlights */}
          <div className="animate-premium-fade-up delay-300 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto w-full">
            {/* Stat Card 1 */}
            <MagneticStatCard>
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3.5 text-orange-400 group-hover:border-orange-500/40 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 22V10m0 12h16m-16 0h-2m18 0h2m-2-12v12M12 2v8M8 6h8M2 10h20M7 10v12M17 10v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">
                  28 States / 8 Union Territories
                </span>
                <span className="text-gray-400 text-[11px] font-medium block mt-1 tracking-wider uppercase">
                  States and Union Territories
                </span>
              </div>
            </MagneticStatCard>

            {/* Stat Card 2 */}
            <MagneticStatCard>
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3.5 text-orange-400 group-hover:border-orange-500/40 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">
                  {districtCount !== null ? <AnimatedCounter target={districtCount} /> : "NA"}
                </span>
                <span className="text-gray-400 text-[11px] font-medium block mt-1 tracking-wider uppercase">
                  Districts in the dataset
                </span>
              </div>
            </MagneticStatCard>

            {/* Stat Card 3 */}
            <MagneticStatCard>
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3.5 text-orange-400 group-hover:border-orange-500/40 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">
                  {indicatorCount !== null ? <AnimatedCounter target={indicatorCount} /> : "NA"}
                </span>
                <span className="text-gray-400 text-[11px] font-medium block mt-1 tracking-wider uppercase">
                  NFHS-5 indicators
                </span>
              </div>
            </MagneticStatCard>

            {/* Stat Card 4 */}
            <MagneticStatCard>
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3.5 text-orange-400 group-hover:border-orange-500/40 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="17" x2="13" y2="17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight">
                  NFHS-5 (2019-21) & NFHS-6 (2023-24)
                </span>
                <span className="text-gray-400 text-[11px] font-medium block mt-1 tracking-wider uppercase">
                  Survey period
                </span>
              </div>
            </MagneticStatCard>
          </div>
        </div>

      </section>

      {/* ── 2. Two Navigation Portals / Sections ── */}
      <section id="explore-section" className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-8">

        {/* Section Header */}
        <ScrollReveal delay={50}>
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              EXPLORE DISTRICT DATA
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Find a district, your way.
            </h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
              Explore districts across India, view survey indicators, and compare available data.
            </p>
          </div>
        </ScrollReveal>

        {/* Dual Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">

          {/* Card 1: Map Explorer */}
          <ScrollReveal delay={150}>
            <div className="flex flex-col justify-between rounded-xl bg-[#161822] border border-[#262A3B] p-5 sm:p-6 hover:border-orange-500/40 transition-colors h-full">
              <div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-3.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Explore districts on the map
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1.5 leading-relaxed">
                  Choose a state and explore its districts on the map.
                </p>
              </div>

              {/* Action row */}
              <div className="pt-4 mt-5 border-t border-[#262A3B] flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400 font-medium">
                  28 States & 8 Union Territories mapped
                </span>
                <Link
                  href="/map"
                  className="py-2 px-3.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm flex-shrink-0"
                >
                  <span>Explore map →</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Search and Filter */}
          <ScrollReveal delay={200}>
            <div className="flex flex-col justify-between rounded-xl bg-[#161822] border border-[#262A3B] p-5 sm:p-6 hover:border-emerald-500/40 transition-colors h-full">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Search districts and indicators
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1.5 leading-relaxed">
                  Search for a district or find information about a survey indicator.
                </p>
              </div>

              {/* Action row */}
              <div className="pt-4 mt-5 border-t border-[#262A3B] flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400 font-medium">
                  {districtCount !== null ? `${districtCount} Districts indexed` : null}
                </span>
                <Link
                  href="/search"
                  className="py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm flex-shrink-0"
                >
                  <span>Search data →</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>

        </div>

        {/* Small footer text */}
        <p className="text-center text-xs text-gray-500 max-w-lg mx-auto pt-2">
          Explore available survey data and compare district values where data is available.
        </p>

      </section>

    </div>
  );
}
