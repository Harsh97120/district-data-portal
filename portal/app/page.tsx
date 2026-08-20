import type { Metadata } from "next";
import IndiaMapWrapper from "@/components/map/IndiaMapWrapper";
import { STATES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "India District Data Portal — Explore NFHS-5 Data",
  description:
    "Interactive map of India. Click a state to explore district-level demographic indicators from NFHS-5 (2019–21).",
};

const statesWithData = STATES.filter((s) => s.hasData);

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 lg:h-[calc(100vh-64px)] lg:overflow-hidden">

      {/* Hero strip */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-5 border-b border-[#2D3148] flex-shrink-0">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold uppercase tracking-widest mb-2">
            <span className="w-5 h-px bg-orange-400" />
            NFHS-5 · 2019–21
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            India District
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300"> Data Portal</span>
          </h1>
          <p className="text-gray-400 mt-1.5 text-xs sm:text-sm max-w-2xl">
            Explore demographic indicators across Indian districts. Click any state on the map to drill down into district-level data from the National Family Health Survey.
          </p>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { label: "States & UTs", value: "36" },
              { label: "Districts", value: "700+" },
              { label: "Indicators", value: "131" },
              { label: "Survey Cycle", value: "NFHS-6 (2023–24)" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1A1D27] border border-[#2D3148] text-xs">
                <span className="text-orange-400 font-bold">{value}</span>
                <span className="text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent" />
      </section>

      {/* Map + States list */}
      <section className="flex flex-col lg:flex-row flex-1 min-h-[450px] lg:min-h-0 overflow-hidden">

        {/* Interactive map */}
        <div className="relative flex-1 min-h-[350px] lg:min-h-0">
          <IndiaMapWrapper />
        </div>

        {/* States sidebar */}
        <aside className="w-full lg:w-72 xl:w-80 bg-[#1A1D27] border-t lg:border-t-0 lg:border-l border-[#2D3148] flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-[#2D3148] flex-shrink-0">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              States with data
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#2D3148]">
            {statesWithData.map((state) => (
              <a
                key={state.code}
                href={`/state/${state.code}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#242838] transition-colors group"
              >
                <div>
                  <p className="text-sm text-white font-medium group-hover:text-orange-400 transition-colors">
                    {state.name}
                  </p>
                  <p className="text-xs text-gray-500">{state.code}</p>
                </div>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
            {/* Upcoming states note */}
            <div className="px-4 py-3 text-xs text-gray-600">
              + {STATES.length - statesWithData.length} more states — data coming soon
            </div>
          </div>
        </aside>
      </section>

    </div>
  );
}
