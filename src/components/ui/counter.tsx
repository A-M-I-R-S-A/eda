"use client";

import { useEffect, useRef, useState } from "react";
import { faNumber } from "@/lib/utils/persian";

/**
 * Count-up statistic.
 *
 * Runs once, on first intersection, with an ease-out curve. Respects
 * `prefers-reduced-motion` by rendering the final value immediately, and the
 * server render already contains the final number so the figure is present
 * without JavaScript.
 */
export function Counter({
  value,
  duration = 1600,
  suffix,
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || started.current) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // `display` already holds the final value, so with reduced motion or no
    // observer there is simply nothing to do — and nothing to set.
    if (reduceMotion || typeof IntersectionObserver === "undefined") return;

    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        // Reset inside the callback (an event, not the effect body) so the
        // count-up only rewinds when it is actually about to run.
        setDisplay(0);
        const start = performance.now();

        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          // easeOutQuart
          const eased = 1 - Math.pow(1 - progress, 4);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      <span className="tabular-nums">{faNumber(display)}</span>
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  );
}
