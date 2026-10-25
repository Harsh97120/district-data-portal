import type { Metadata } from "next";
import Link from "next/link";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import MagneticStatCard from "@/components/ui/MagneticStatCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import ScrollIndicator from "@/components/ui/ScrollIndicator";
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
          <div className="animate-premium-fade-up delay-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium tracking-wide mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
            National Family Health Survey · NFHS-5 (2019–21)
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
                  NFHS-5 (2019–21)
                </span>
                <span className="text-gray-400 text-[11px] font-medium block mt-1 tracking-wider uppercase">
                  Survey period
                </span>
              </div>
            </MagneticStatCard>
          </div>
        </div>

        {/* Scroll mouse indicator */}
        <ScrollIndicator />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">

          {/* Card 1: Map Explorer */}
          <ScrollReveal delay={150}>
            <div className="flex flex-col justify-between rounded-2xl bg-[#161822]/90 border border-[#262A3B] p-6 sm:p-7 shadow-sm hover:border-orange-500/40 hover:-translate-y-1 transition-all duration-200 group h-full">
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-orange-400/90 tracking-wide uppercase">
                      Browse by location
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                      Explore districts on the map
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                      Choose a state to view its districts and available data.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                </div>

                {/* Map Visual Preview Box */}
                <div className="my-5 rounded-xl bg-[#12141D] border border-[#262A3B] p-4 flex items-center justify-between gap-4 min-h-[140px] relative overflow-hidden">
                  <div className="space-y-2 z-10 max-w-[60%]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-xs font-semibold text-gray-200">Interactive GIS Map</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Select states to view district boundary lines, literacy choropleths, and key indicators.
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-medium">
                        State Zoom
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-medium">
                        Choropleth
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-medium">
                        Side Panel
                      </span>
                    </div>
                  </div>

                  {/* India outline SVG silhouette */}
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="20 0 80 115" className="w-full h-full text-orange-400/80 drop-shadow-sm" fill="none">
                      <line x1="20" y1="35" x2="100" y2="35" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 2" />
                      <line x1="20" y1="70" x2="100" y2="70" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 2" />
                      <line x1="60" y1="0" x2="60" y2="115" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 2" />
                      <path
                        d="M 50 5 L 53 10 L 52 15 L 55 20 L 54 25 L 58 28 L 62 28 L 66 32 L 72 32 L 76 35 L 82 30 L 88 30 L 92 34 L 92 40 L 88 44 L 82 44 L 76 46 L 72 44 L 70 50 L 64 54 L 60 62 L 56 72 L 53 84 L 51 96 L 51 102 L 48 92 L 46 80 L 44 70 L 42 60 L 38 52 L 33 48 L 29 40 L 33 34 L 38 30 L 42 28 L 44 20 L 47 15 L 47 10 Z"
                        fill="rgba(255, 107, 53, 0.12)"
                        stroke="#FF6B35"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <circle cx="38" cy="48" r="3" fill="#FF6B35" />
                      <circle cx="38" cy="48" r="6" stroke="#FF6B35" strokeWidth="1" strokeOpacity="0.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-4 border-t border-[#262A3B] flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">37 States & UTs mapped</span>
                <Link
                  href="/map"
                  className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Explore map →</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Search and Filter */}
          <ScrollReveal delay={200}>
            <div className="flex flex-col justify-between rounded-2xl bg-[#161822]/90 border border-[#262A3B] p-6 sm:p-7 shadow-sm hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-200 group h-full">
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-400/90 tracking-wide uppercase">
                      Browse by keyword
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                      Search districts and indicators
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                      Find a district or look up a survey indicator by name.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Search Visual Preview Box */}
                <div className="my-5 rounded-xl bg-[#12141D] border border-[#262A3B] p-4 flex flex-col justify-between min-h-[140px] space-y-3">
                  {/* Simulated search input */}
                  <Link
                    href="/search"
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#181B26] border border-[#2D3148] hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-gray-400 min-w-0">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-xs text-gray-400 truncate">Search Surat, Gujarat, Child anaemia...</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10 flex-shrink-0 ml-2">
                      Filter
                    </span>
                  </Link>

                  {/* Example query chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">
                      Popular queries:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href="/district/GJ-Surat"
                        className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-colors"
                      >
                        Surat
                      </Link>
                      <Link
                        href="/state/GJ"
                        className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                      >
                        Gujarat
                      </Link>
                      <Link
                        href="/search"
                        className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                      >
                        Child anaemia
                      </Link>
                      <Link
                        href="/search"
                        className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                      >
                        Literacy rate
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-4 border-t border-[#262A3B] flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">739 Districts indexed</span>
                <Link
                  href="/search"
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
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
