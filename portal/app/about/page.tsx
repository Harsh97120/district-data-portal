import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "About the Project — India District Data Portal",
  description:
    "India District Data Portal brings district-level survey data together in one place. A student project by Naitik Patel at Dhirubhai Ambani University (DA-IICT), Gandhinagar.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0F1117] text-gray-200">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 sm:space-y-12">
        {/* ── Breadcrumb & Header ── */}
        <div className="space-y-4">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />

          <div className="pt-2 space-y-3">
            <p className="text-xs font-semibold text-orange-400 tracking-wider uppercase">
              Academic Project
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              About the Project
            </h1>
            <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              India District Data Portal brings district-level survey data together in one place.
              It helps users explore health and nutrition indicators, find district information, and
              compare available figures.
            </p>
          </div>
        </div>

        <hr className="border-[#2D3148]" />

        {/* ── What the Portal Offers ── */}
        <section className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            What the portal offers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 pt-1">
            {/* Feature 1 */}
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex-shrink-0 text-orange-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 6.75V15m6-6v8.25m.503-14.747 4.25 1.7a1.125 1.125 0 0 1 .697 1.043v11.706a1.125 1.125 0 0 1-1.547 1.042l-4.103-1.641a1.125 1.125 0 0 0-.82 0l-4.96 1.984a1.125 1.125 0 0 1-.82 0l-4.103-1.641a1.125 1.125 0 0 1-.747-1.042V4.747a1.125 1.125 0 0 1 1.547-1.042l4.103 1.641a1.125 1.125 0 0 0 .82 0l4.96-1.984a1.125 1.125 0 0 1 .82 0Z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Explore districts</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Select a state and browse its districts on the interactive map or by name.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex-shrink-0 text-orange-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Search indicators</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Look up specific indicators across health, nutrition, and demographics.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex-shrink-0 text-orange-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Compare data</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Compare district values with state-level figures wherever data is available.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex-shrink-0 text-orange-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">View district details</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Examine charts, survey figures, and demographic profiles for any district.
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-[#2D3148]" />

        {/* ── How to Use the Portal ── */}
        <section className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            How to use the portal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            <div className="border-t border-[#2D3148] pt-4 space-y-1.5">
              <span className="text-xs font-mono font-semibold text-orange-400">Step 1</span>
              <h3 className="text-sm font-semibold text-white">Choose a state and district</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Select a state from the map explorer or use the search box to find a district.
              </p>
            </div>

            <div className="border-t border-[#2D3148] pt-4 space-y-1.5">
              <span className="text-xs font-mono font-semibold text-orange-400">Step 2</span>
              <h3 className="text-sm font-semibold text-white">Select an indicator</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Pick an indicator you want to explore across health, nutrition, or education.
              </p>
            </div>

            <div className="border-t border-[#2D3148] pt-4 space-y-1.5">
              <span className="text-xs font-mono font-semibold text-orange-400">Step 3</span>
              <h3 className="text-sm font-semibold text-white">Review and compare</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Review the available figures and compare them with state data where possible.
              </p>
            </div>
          </div>
        </section>

        <hr className="border-[#2D3148]" />

        {/* ── What is NFHS? ── */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            What is NFHS?
          </h2>

          <div className="space-y-3 text-sm sm:text-base text-gray-300 leading-relaxed max-w-3xl">
            <p>
              NFHS stands for the <strong className="font-bold text-white">National Family Health Survey</strong>. It is a large survey conducted across India to collect information about people&apos;s health and family well-being. It covers topics such as health, nutrition, women and children, and access to healthcare.
            </p>
            <p>
              The survey provides information about different states and districts. This website uses NFHS data to help users explore district-level information, understand survey results, and compare available data between districts and states.
            </p>
          </div>
        </section>

        <hr className="border-[#2D3148]" />

        {/* ── About the Data ── */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            About the data
          </h2>

          <div className="space-y-3 text-sm sm:text-base text-gray-300 leading-relaxed max-w-3xl">
            <p>
              The portal uses data from the NFHS survey reports and fact sheets. It presents available information in a simple format using maps, charts, and district dashboards.
            </p>
            <p>
              The values shown on the website come from the available survey datasets. Some indicators or districts may not have data available. Survey results describe the period in which the survey was conducted and may not represent the current situation.
            </p>
            <div className="pt-1">
              <p className="text-sm font-medium text-white mb-2">
                Supported survey periods:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 pl-1">
                <li>
                  <strong className="text-white font-medium">NFHS-5:</strong> 2019–21
                </li>
                <li>
                  <strong className="text-white font-medium">NFHS-6:</strong> 2023–24
                </li>
              </ul>
            </div>
          </div>
        </section>

        <hr className="border-[#2D3148]" />

        {/* ── About the Developer ── */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            About the developer
          </h2>

          <div className="space-y-3 text-sm sm:text-base text-gray-300 leading-relaxed max-w-3xl">
            <p>
              This portal was developed by <strong className="text-white font-medium">Naitik Patel</strong> as a B.Tech mini-project at <strong className="text-white font-medium">Dhirubhai Ambani University (DA-IICT)</strong>, Gandhinagar.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              The project is focused on making district-level demographic and health survey data
              easier to explore through interactive maps, searchable indicators, and comparative
              visualisations.
            </p>
          </div>
        </section>

        {/* ── Editorial Navigation Links ── */}
        <div className="pt-6 border-t border-[#2D3148] flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-400">Ready to explore?</span>
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-medium transition-colors"
          >
            Open Map Explorer <span aria-hidden="true">&rarr;</span>
          </Link>
          <span className="text-gray-600">·</span>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 text-gray-300 hover:text-white font-medium transition-colors"
          >
            Search &amp; Filter <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
