"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { Icon } from "./icon";

export interface AccordionItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Accordion.
 *
 * Height animates via `grid-template-rows: 0fr → 1fr`, so there is no JS
 * measurement and no layout jank. Buttons carry the correct
 * `aria-expanded` / `aria-controls` wiring.
 */
export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenId,
  numbered = false,
  className,
}: {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenId?: string;
  numbered?: boolean;
  className?: string;
}) {
  const baseId = useId();
  const [open, setOpen] = useState<string[]>(
    defaultOpenId ? [defaultOpenId] : [],
  );

  const toggle = (id: string) => {
    setOpen((current) => {
      const isOpen = current.includes(id);
      if (allowMultiple) {
        return isOpen ? current.filter((x) => x !== id) : [...current, id];
      }
      return isOpen ? [] : [id];
    });
  };

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item, index) => {
        const isOpen = open.includes(item.id);
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  "group flex w-full items-start gap-4 py-5 text-start sm:py-6",
                  "transition-colors duration-200 hover:text-navy-950",
                )}
              >
                {numbered && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1 w-6 shrink-0 text-[0.8125rem] font-semibold tabular-nums transition-colors",
                      isOpen ? "text-gold-600" : "text-muted-2",
                    )}
                  >
                    {fa(String(index + 1).padStart(2, "0"))}
                  </span>
                )}

                <span className="flex-1 text-[1.0625rem] font-semibold leading-[1.75] text-navy-900">
                  {item.question}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-400 ease-[var(--ease-out-quint)]",
                    isOpen
                      ? "rotate-180 border-navy-900 bg-navy-900 text-white"
                      : "border-line-2 text-muted group-hover:border-navy-400",
                  )}
                >
                  <Icon name="chevron-down" size={16} />
                </span>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-out-quint)]",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "pb-6 text-[0.9375rem] leading-[2.1] text-ink-2",
                    numbered && "ps-10",
                  )}
                >
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
