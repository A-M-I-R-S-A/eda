import Link from "next/link";
import type { Arbitrator } from "@/types";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/config/routes";
import { faNumber } from "@/lib/utils/persian";
import { Portrait } from "@/components/brand/portrait";
import { Icon } from "@/components/ui/icon";

/**
 * Card for an arbitrator *other than* the principal.
 *
 * The institution has one arbitrator, who gets a full profile page rather than
 * a card, so this renders only if further arbitrators are added later. Fields
 * the institution has not supplied — bio, expertise, years — are omitted
 * instead of being shown empty or invented.
 */
export function ArbitratorCard({
  arbitrator,
  priority = false,
  className,
}: {
  arbitrator: Arbitrator;
  priority?: boolean;
  className?: string;
}) {
  return (
    <article className={cn("group flex flex-col bg-white", className)}>
      <Link
        href={ROUTES.arbitratorProfile(arbitrator.slug)}
        className="flex flex-1 flex-col outline-offset-4"
      >
        <div className="relative overflow-hidden">
          <Portrait
            fullName={arbitrator.fullName}
            photoUrl={arbitrator.photoUrl}
            priority={priority}
            className="aspect-[4/5] w-full transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.02]"
          />
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-[1.0625rem] font-bold text-navy-900">
            {arbitrator.fullName}
          </h3>
          <p className="mt-1 text-[0.8125rem] text-gold-600">{arbitrator.title}</p>

          {arbitrator.shortBio.trim() && (
            <p className="mt-4 line-clamp-3 flex-1 text-[0.875rem] leading-[2] text-muted">
              {arbitrator.shortBio}
            </p>
          )}

          {arbitrator.expertise.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {arbitrator.expertise.slice(0, 3).map((item) => (
                <li
                  key={item}
                  className="rounded-xs bg-paper-2 px-2.5 py-1 text-[0.6875rem] text-ink-2"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <span className="text-[0.75rem] text-muted-2">
              {arbitrator.yearsOfExperience > 0
                ? `${faNumber(arbitrator.yearsOfExperience)} سال سابقه`
                : ""}
            </span>
            <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-navy-800">
              پروفایل
              <Icon
                name="arrow-forward"
                size={15}
                className="text-gold-600 transition-transform duration-400 group-hover:-translate-x-1"
              />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Row used on the appointment step that picks an arbitrator. */
export function ArbitratorRow({
  arbitrator,
  selected = false,
}: {
  arbitrator: Arbitrator;
  selected?: boolean;
}) {
  return (
    <span className="flex items-center gap-4">
      <Portrait
        fullName={arbitrator.fullName}
        photoUrl={arbitrator.photoUrl}
        rounded
        className="size-14 shrink-0"
        sizes="56px"
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[0.9375rem] font-semibold",
            selected ? "text-navy-950" : "text-navy-900",
          )}
        >
          {arbitrator.fullName}
        </span>
        <span className="mt-0.5 block text-[0.8125rem] text-muted">
          {arbitrator.title}
        </span>
        {arbitrator.expertise.length > 0 && (
          <span className="mt-1.5 block text-[0.75rem] text-muted-2">
            {arbitrator.expertise.slice(0, 2).join(" • ")}
          </span>
        )}
      </span>
    </span>
  );
}
