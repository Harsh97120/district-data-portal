"use client";
import { useState, useEffect, useRef } from "react";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  duration?: number;
}

export default function AnimatedCounter({ target, suffix = "", duration = 1200 }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Check reduced motion settings
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setCount(target);
      return;
    }

    let observer: IntersectionObserver;
    let startTimestamp: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Apply easeOutQuad easing
      const easeProgress = progress * (2 - progress);
      setCount(Math.floor(easeProgress * target));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        frameId = window.requestAnimationFrame(animate);
        if (observer) observer.disconnect();
      }
    };

    if (elementRef.current) {
      observer = new IntersectionObserver(handleIntersection, { threshold: 0.1 });
      observer.observe(elementRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [target, duration]);

  return (
    <span ref={elementRef} className="font-extrabold text-white tracking-tight">
      {count}
      {suffix}
    </span>
  );
}
