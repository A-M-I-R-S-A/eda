import type { Arbitrator } from "@/types";
import { ROUTES } from "@/lib/config/routes";
import { faNumber } from "@/lib/utils/persian";
import { Portrait } from "@/components/brand/portrait";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/section";
import { PendingContent } from "@/components/ui/pending";

/**
 * The institution's arbitrator, on the homepage.
 *
 * This is deliberately a *portrait spread*, not a card grid: the institution
 * has one arbitrator, and a grid — even a grid of one — reads as the first row
 * of a roster. The hierarchy the section states is مؤسسه → داور: the
 * institution is the eyebrow, the person is the headline beneath it.
 *
 * Nothing here is asserted unless it was supplied. Empty biography, expertise
 * or experience fields collapse out of the layout instead of being filled with
 * invented copy.
 */
export function PrincipalArbitrator({
  arbitrator,
  institutionName,
}: {
  arbitrator: Arbitrator | null;
  institutionName: string;
}) {
  if (!arbitrator) return null;

  const hasExperience = arbitrator.yearsOfExperience > 0;
  const areas = arbitrator.expertise.length
    ? arbitrator.expertise
    : arbitrator.practiceAreas;

  return (
    <section className="section border-b border-line bg-paper-2/40">
      <div className="container-x">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          {/* -- portrait --------------------------------------------------- */}
          <div className="lg:col-span-5">
            <div className="relative max-w-md">
              <Portrait
                fullName={arbitrator.fullName}
                photoUrl={arbitrator.photoUrl}
                sizes="(max-width: 1024px) 90vw, 460px"
                className="aspect-[4/5] w-full border border-line"
              />

              {/* Name plate — the institution above, the person below it. */}
              <div className="absolute inset-x-5 bottom-5">
                <div className="border border-white/12 bg-navy-950/80 px-5 py-4 backdrop-blur-sm">
                  <p className="text-[0.6875rem] tracking-wide text-white/50">
                    {institutionName}
                  </p>
                  <p className="mt-1.5 text-[1.0625rem] font-bold text-white">
                    {arbitrator.fullName}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-gold-300">
                    {arbitrator.title}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* -- copy ------------------------------------------------------- */}
          <div className="lg:col-span-7">
            <Eyebrow>داور مجموعه</Eyebrow>

            <h2 className="display-2 mt-6">
              رسیدگی، بر عهده یک داور مشخص و پاسخگوست
            </h2>

            <p className="lead mt-6">
              پرونده میان چند نفر دست‌به‌دست نمی‌شود. از نخستین بررسی تا صدور رأی،
              مسئولیت رسیدگی با {arbitrator.fullName} است.
            </p>

            {arbitrator.shortBio.trim() ? (
              <p className="mt-5 text-[0.9375rem] leading-[2.1] text-muted">
                {arbitrator.shortBio}
              </p>
            ) : (
              <PendingContent
                className="mt-6 max-w-xl"
                label="معرفی کوتاه داور"
                hint="از مسیر «پنل مدیریت ← داور» قابل ویرایش است."
              />
            )}

            {areas.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2">
                {areas.slice(0, 6).map((item) => (
                  <li
                    key={item}
                    className="rounded-xs border border-line-2 bg-white px-3 py-1.5 text-[0.8125rem] text-ink-2"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {hasExperience && (
              <p className="mt-6 text-[0.875rem] text-muted-2">
                {faNumber(arbitrator.yearsOfExperience)} سال سابقه حرفه‌ای
              </p>
            )}

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink
                href={ROUTES.arbitrator}
                variant="primary"
                size="lg"
                iconEnd="arrow-forward"
              >
                پروفایل کامل داور
              </ButtonLink>

              {arbitrator.bookable && (
                <ArrowLink href={`${ROUTES.appointment}?arbitrator=${arbitrator.id}`}>
                  رزرو وقت مشاوره
                </ArrowLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
