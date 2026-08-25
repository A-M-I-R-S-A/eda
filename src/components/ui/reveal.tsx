"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Scroll-reveal wrapper.
 *
 * One IntersectionObserver per element, disconnected after the first trigger —
 * no scroll listeners, no layout thrash. Content is fully visible when JS is
 * unavailable or `prefers-reduced-motion` is set (handled in CSS), so this is
 * decorative only and never gates content.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  threshold = 0.12,
}: {
  children: ReactNode;
  /** Stagger in milliseconds. */
  delay?: number;
  as?: ElementType;
  className?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      // No observer available: reveal through the DOM directly rather than
      // scheduling a state update from the effect body.
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
