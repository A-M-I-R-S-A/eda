import Link from "next/link";
import type { Service } from "@/types";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { ROUTES } from "@/lib/config/routes";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * Service cell.
 *
 * Designed to sit inside a `gap-px bg-line` grid so the card borders merge
 * into one continuous rule — an editorial table rather than a row of floating
 * boxes.
 */
export function ServiceCard({
  service,
  index,
  className,
}: {
  service: Service;
  index?: number;
  className?: string;
}) {
  return (
    <Link
      href={ROUTES.service(service.slug)}
      className={cn(
        "group relative flex flex-col bg-white p-7 transition-colors duration-400 hover:bg-paper-2/60 lg:p-8",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 items-center justify-center border border-line-2 text-navy-700 transition-colors duration-400 group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-gold-200">
          <Icon name={service.icon as IconName} size={21} />
        </span>

        {index !== undefined && (
          <span
            aria-hidden="true"
            className="text-[0.6875rem] font-semibold tabular-nums text-muted-2"
          >
            {fa(String(index + 1).padStart(2, "0"))}
          </span>
        )}
      </div>

      <h3 className="mt-6 text-[1.125rem] font-bold text-navy-900">
        {service.title}
      </h3>

      <p className="mt-3 flex-1 text-[0.9375rem] leading-[2] text-muted">
        {service.shortDescription}
      </p>

      <span className="mt-6 inline-flex items-center gap-2 text-[0.875rem] font-semibold text-navy-800">
        مشاهده جزئیات
        <Icon
          name="arrow-forward"
          size={16}
          className="text-gold-600 transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:-translate-x-1"
        />
      </span>

      {/* gold rule that draws in on hover */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-gold-400 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-x-100"
      />
    </Link>
  );
}

/** Compact variant used in the "related services" rail. */
export function ServiceCardCompact({ service }: { service: Service }) {
  return (
    <Link
      href={ROUTES.service(service.slug)}
      className="surface card-lift group flex items-start gap-4 p-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center border border-line-2 text-navy-700 transition-colors duration-400 group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-gold-200">
        <Icon name={service.icon as IconName} size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold text-navy-900">
          {service.title}
        </span>
        <span className="mt-1 block line-clamp-2 text-[0.8125rem] leading-[1.9] text-muted">
          {service.shortDescription}
        </span>
      </span>

      <Icon
        name="arrow-forward"
        size={16}
        className="mt-1 shrink-0 text-gold-600 transition-transform duration-400 group-hover:-translate-x-1"
      />
    </Link>
  );
}
