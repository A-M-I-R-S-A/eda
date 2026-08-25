"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { UI } from "@/lib/config/labels";
import { Icon } from "./icon";

/**
 * Copies a tracking or booking code to the clipboard.
 *
 * Falls back to a hidden textarea + `execCommand` for browsers where the async
 * Clipboard API is unavailable or blocked by permissions.
 */
export function CopyButton({
  value,
  label = UI.copy,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    let ok = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        ok = true;
      }
    } catch {
      ok = false;
    }

    if (!ok) {
      try {
        const el = document.createElement("textarea");
        el.value = value;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        ok = document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        ok = false;
      }
    }

    if (ok) {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label}: ${value}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1.5",
        "text-[0.75rem] font-medium transition-colors duration-200",
        copied
          ? "border-success/30 bg-success-soft text-success"
          : "border-line-2 text-muted hover:border-navy-400 hover:text-navy-800",
        className,
      )}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      <span>{copied ? UI.copied : label}</span>
    </button>
  );
}
