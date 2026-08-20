"use client";

export default function ScrollIndicator() {
  return (
    <button
      onClick={() => {
        document.getElementById("explore-section")?.scrollIntoView({ behavior: "smooth" });
      }}
      title="Scroll to exploration modes"
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-all duration-300 z-20 cursor-pointer select-none border-none bg-transparent outline-none focus:outline-none"
    >
      <div className="w-5.5 h-9 rounded-full border-2 border-gray-500/70 flex justify-center p-1.5 shadow-md bg-[#0F1117]/30 backdrop-blur-sm active:scale-95 transition-transform">
        <div className="w-1.5 h-2.5 bg-orange-400 rounded-full animate-scroll-mouse" />
      </div>
      <svg className="w-3.5 h-3.5 text-gray-500/80 animate-pulse mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
