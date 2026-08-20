"use client";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Check reduced motion setting
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 250);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className={`transition-all duration-300 transform ${
        isTransitioning 
          ? "opacity-0 translate-y-2.5 blur-[1px]" 
          : "opacity-100 translate-y-0 blur-0"
      }`}
    >
      {children}
    </div>
  );
}
