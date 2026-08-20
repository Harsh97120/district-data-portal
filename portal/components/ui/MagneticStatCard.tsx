"use client";
import React, { useRef, useState, useEffect } from "react";

interface MagneticStatCardProps {
  children: React.ReactNode;
}

export default function MagneticStatCard({ children }: MagneticStatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (isMobile || mediaQuery.matches) return;

    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -2.5; // max 2.5 degrees tilt
    const tiltY = ((x - centerX) / centerX) * 2.5; // max 2.5 degrees tilt
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseEnter = () => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (isMobile || mediaQuery.matches) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // Render cursor radial glow styling
  const glowStyle: React.CSSProperties = isHovered
    ? {
        background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 107, 53, 0.08) 0%, transparent 50%)`,
      }
    : {
        background: "transparent",
      };

  const transformStyle = {
    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transition: isHovered 
      ? "transform 0.1s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease" 
      : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease",
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={transformStyle}
      className="relative flex flex-col justify-between p-5 rounded-2xl bg-[#1A1D27]/80 border border-[#2D3148] shadow-sm hover:border-[#FF6B35]/40 hover:shadow-[0_0_20px_rgba(255,107,53,0.05)] transition-all group text-left min-h-[110px] overflow-hidden"
    >
      {/* Internal cursor radial glow overlay */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0" 
        style={glowStyle} 
      />
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
