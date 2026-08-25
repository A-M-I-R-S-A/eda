import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";

/**
 * Placeholder for a section whose real content has not been supplied yet.
 *
 * The site represents a real legal institution, so an empty section is shown
 * as visibly empty rather than filled with plausible-sounding invention. This
 * block keeps the page composed and typographically intact while saying
 * plainly that the copy is pending — and it disappears the moment the field is
 * filled in from the admin panel.
 */
export function PendingContent({
  label,
  hint,
  onDark = false,
  className,
}: {
  /** What is missing, e.g. «متن معرفی». */
  label: string;
  /** Optional extra line describing what will appear here. */
  hint?: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 border border-dashed px-5 py-4",
        onDark ? "border-white/20" : "border-line-2 bg-paper-2/40",
        className,
      )}
    >
      <Icon
        name="info"
        size={17}
        className={cn("mt-0.5 shrink-0", onDark ? "text-gold-300" : "text-gold-600")}
      />
      <p
        className={cn(
          "text-[0.8125rem] leading-[2]",
          onDark ? "text-white/55" : "text-muted",
        )}
      >
        {label} پس از دریافت اطلاعات رسمی تکمیل می‌شود.
        {hint && <span className="block text-muted-2">{hint}</span>}
      </p>
    </div>
  );
}
