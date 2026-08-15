export default function Footer() {
  return (
    <footer className="bg-[#0F1117] border-t border-[#2D3148] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white mb-1">India District Data Portal</p>
            <p className="text-xs text-gray-500">
              Built for Sem 7 BMP2 — Demographic Data Visualisation
            </p>
          </div>
          <div className="text-xs text-gray-500 text-left md:text-right space-y-1">
            <p>
              Metric data:{" "}
              <a
                href="https://rchiips.org/nfhs/nfhs5.shtml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                NFHS-5 (2019–21)
              </a>
              , MoHFW, Government of India
            </p>
            <p>
              District boundaries:{" "}
              <a
                href="https://github.com/datta07/INDIAN-SHAPEFILES"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                datta07/INDIAN-SHAPEFILES
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
