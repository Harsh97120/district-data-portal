"use client";
import { useEffect, useRef } from "react";

export default function LiveDataBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Bounding Polygon for India Map Shape Outline (0-100 x, 0-110 y coordinate space)
    const indiaPolygon = [
      { x: 50, y: 5 },   { x: 53, y: 10 },  { x: 52, y: 15 },  { x: 55, y: 20 },
      { x: 54, y: 25 },  { x: 58, y: 28 },  { x: 62, y: 28 },  { x: 66, y: 32 },
      { x: 72, y: 32 },  { x: 76, y: 35 },  { x: 82, y: 30 },  { x: 88, y: 30 },
      { x: 92, y: 34 },  { x: 92, y: 40 },  { x: 88, y: 44 },  { x: 82, y: 44 },
      { x: 76, y: 46 },  { x: 72, y: 44 },  { x: 70, y: 50 },  { x: 64, y: 54 },
      { x: 60, y: 62 },  { x: 56, y: 72 },  { x: 53, y: 84 },  { x: 51, y: 96 },
      { x: 51, y: 102 }, { x: 48, y: 92 },  { x: 46, y: 80 },  { x: 44, y: 70 },
      { x: 42, y: 60 },  { x: 38, y: 52 },  { x: 33, y: 48 },  { x: 29, y: 40 },
      { x: 33, y: 34 },  { x: 38, y: 30 },  { x: 42, y: 28 },  { x: 44, y: 20 },
      { x: 47, y: 15 },  { x: 47, y: 10 }
    ];

    const isPointInPolygon = (p: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
      let isInside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > p.y) !== (yj > p.y))
            && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
      }
      return isInside;
    };

    let indiaDots: { x: number; y: number; distToGlow: number; neighbors: number[] }[] = [];
    let mapX = 60;
    let mapY = 125;
    let mapWidth = 250;
    let mapHeight = 280;
    let glowTargetX = 0;
    let glowTargetY = 0;

    const setupIndiaMap = () => {
      indiaDots = [];
      const isMobileSize = window.innerWidth < 768;
      mapWidth = isMobileSize ? 180 : 360; // Enlarged from 140 : 250
      mapHeight = isMobileSize ? 200 : 400; // Enlarged from 160 : 280
      mapX = isMobileSize ? 10 : 35; // Position shifted closer to edge to allocate screen space
      mapY = isMobileSize ? 60 : 100;

      const scaledPolygon = indiaPolygon.map(pt => ({
        x: mapX + (pt.x / 100) * mapWidth,
        y: mapY + (pt.y / 110) * mapHeight
      }));

      let minX = width, maxX = 0, minY = height, maxY = 0;
      scaledPolygon.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      });

      glowTargetX = mapX + (43 / 100) * mapWidth;
      glowTargetY = mapY + (48 / 110) * mapHeight;

      const dotSpacing = isMobileSize ? 8 : 6;
      for (let x = minX; x <= maxX; x += dotSpacing) {
        for (let y = minY; y <= maxY; y += dotSpacing) {
          if (isPointInPolygon({ x, y }, scaledPolygon)) {
            const dx = x - glowTargetX;
            const dy = y - glowTargetY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            indiaDots.push({ x, y, distToGlow: dist, neighbors: [] });
          }
        }
      }

      // Pre-calculate neighbor indices within distance to render a clean, high-fps network mesh
      const maxConnDist = dotSpacing * 2.8;
      const minConnDist = dotSpacing * 0.9;
      for (let i = 0; i < indiaDots.length; i++) {
        const dot = indiaDots[i];
        for (let j = i + 1; j < indiaDots.length; j++) {
          const other = indiaDots[j];
          const dx = other.x - dot.x;
          const dy = other.y - dot.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= minConnDist && d <= maxConnDist && Math.random() < 0.28) {
            dot.neighbors.push(j);
            if (dot.neighbors.length >= 2) break; // Limit grid connections to keep it clean
          }
        }
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      setupIndiaMap();
    };
    window.addEventListener("resize", handleResize);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isReducedMotion = mediaQuery.matches;
    const isMobile = window.innerWidth < 768;

    setupIndiaMap();

    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };

    if (!isMobile && !isReducedMotion) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    let scrollY = 0;
    const handleScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    let pulseTimer = 0;
    let scanX = -300;
    const gridSize = 48;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isMobile && !isReducedMotion) {
        mouseX += (targetMouseX - mouseX) * 0.08;
        mouseY += (targetMouseY - mouseY) * 0.08;
      }

      const parallaxY = scrollY * -0.15;
      const mouseParallaxX = !isMobile && !isReducedMotion ? (mouseX - width / 2) * 0.015 : 0;
      const mouseParallaxY = !isMobile && !isReducedMotion ? (mouseY - height / 2) * 0.015 : 0;

      ctx.save();
      ctx.translate(mouseParallaxX, mouseParallaxY + parallaxY);

      // Check active theme in real-time
      const isDark = document.documentElement.classList.contains("dark");

      // ── 1. GRID LAYER ──
      pulseTimer += 0.004;
      const gridOpacity = 0.015 + Math.sin(pulseTimer) * 0.004;
      ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${gridOpacity})` : `rgba(17, 24, 39, ${gridOpacity * 0.65})`;
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // ── 2. DATA SCANNING SWEEP LAYER ──
      if (!isReducedMotion) {
        scanX += 0.8;
        if (scanX > width + 300) {
          scanX = -300;
        }

        const scanGradient = ctx.createLinearGradient(scanX - 150, 0, scanX + 150, 0);
        scanGradient.addColorStop(0, "rgba(255, 107, 53, 0)");
        scanGradient.addColorStop(0.5, isDark ? "rgba(255, 107, 53, 0.045)" : "rgba(255, 107, 53, 0.02)");
        scanGradient.addColorStop(1, "rgba(255, 107, 53, 0)");
        ctx.fillStyle = scanGradient;
        ctx.fillRect(0, 0, width, height);
      }

      // ── 3. DOTTED INDIA MAP LAYER (Propagating Scanner Ripple with Network Connections) ──
      // waveRadius expands and loops outward from the center target pulse
      const maxRippleRadius = isMobile ? 250 : 500;
      const waveRadius = (pulseTimer * 220) % maxRippleRadius;
      
      // Draw connection lines first so they render under the dots
      if (!isReducedMotion) {
        indiaDots.forEach(dot => {
          dot.neighbors.forEach(neighborIdx => {
            const neighbor = indiaDots[neighborIdx];
            if (!neighbor) return;
            
            const dist1 = dot.distToGlow;
            const dist2 = neighbor.distToGlow;
            const intensity1 = Math.max(0, 1 - Math.abs(dist1 - waveRadius) / 30);
            const intensity2 = Math.max(0, 1 - Math.abs(dist2 - waveRadius) / 30);
            
            const waveIntensity = intensity1 * intensity2;
            if (waveIntensity > 0.05) {
              ctx.beginPath();
              ctx.moveTo(dot.x, dot.y);
              ctx.lineTo(neighbor.x, neighbor.y);
              ctx.strokeStyle = `rgba(255, 107, 53, ${waveIntensity * (isDark ? 0.22 : 0.35)})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          });
        });
      }

      // Draw map dots
      indiaDots.forEach(dot => {
        const dist = dot.distToGlow;
        const distFromWave = Math.abs(dist - waveRadius);
        
        // rippleIntensity peaks at 1 when the wave shell crosses over this dot
        const rippleIntensity = Math.max(0, 1 - distFromWave / 30);
        
        // Baseline breathing glow for all dots (higher baseline contrast needed for light background)
        const baselineAlpha = isDark
          ? (0.13 + Math.sin(pulseTimer * 2.5 + dot.y * 0.02) * 0.04)
          : (0.16 + Math.sin(pulseTimer * 2.5 + dot.y * 0.02) * 0.03);
        
        const dotSize = 1.0 + rippleIntensity * 1.5;
        const alpha = baselineAlpha + rippleIntensity * (isDark ? 0.35 : 0.4);

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 130, 60, ${alpha})`;
        ctx.fill();
      });

      if (!isReducedMotion) {
        // Expands in sync with the physical dot ripples
        ctx.beginPath();
        ctx.arc(glowTargetX, glowTargetY, waveRadius, 0, Math.PI * 2);
        const waveFade = Math.max(0, 1 - waveRadius / maxRippleRadius);
        ctx.strokeStyle = `rgba(255, 107, 53, ${waveFade * (isDark ? 0.32 : 0.38)})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      ctx.restore();

      // Mouse Ambient tracking glow overlay
      if (!isMobile && !isReducedMotion && mouseX && mouseY) {
        const mouseGlow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 180);
        mouseGlow.addColorStop(0, isDark ? "rgba(255, 107, 53, 0.065)" : "rgba(255, 107, 53, 0.05)");
        mouseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = mouseGlow;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: "screen" }} />;
}
