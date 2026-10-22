import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#0F1117] border-t border-[#2D3148] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">India District Data Portal</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
                Student Project
              </span>
            </div>
            <p className="text-xs text-gray-400">
              A student project by Naitik Patel · Dhirubhai Ambani University (DA-IICT), Gandhinagar
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400">
            <Link href="/about" className="hover:text-orange-400 transition-colors">
              About the Portal
            </Link>
            <Link href="/map" className="hover:text-orange-400 transition-colors">
              Map Explorer
            </Link>
            <Link href="/search" className="hover:text-orange-400 transition-colors">
              Search &amp; Filter
            </Link>
            <span className="text-gray-600">|</span>
            <span>
              Data:{" "}
              <a
                href="https://rchiips.org/nfhs/nfhs5.shtml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                NFHS-5 (2019–21)
              </a>
              , MoHFW
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
