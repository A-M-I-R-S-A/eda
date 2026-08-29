import Image from "next/image";
import Link from "next/link";
import type {
  Arbitrator,
  Article,
  Category,
  FaqItem,
  PageSection,
  SectionData,
  SiteSettings,
  Testimonial,
} from "@/types";
import { cn } from "@/lib/utils/cn";
import { bool, columns, link, num, rows, str } from "@/lib/cms/section-data";
import { ROUTES, arbitratorPublicHref } from "@/lib/config/routes";
import { fa, faPhone } from "@/lib/utils/persian";
import { RichText } from "@/lib/content/rich-text";
import { SOCIAL_PLATFORM } from "@/lib/config/labels";
import { ButtonLink } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";
import { Counter } from "@/components/ui/counter";
import { Accordion } from "@/components/ui/accordion";
import { Portrait } from "@/components/brand/portrait";
import { HeroVisual } from "@/components/brand/hero-visual";
import { ArticleCard } from "@/components/cards/article-card";
import { ContactForm } from "@/components/forms/contact-form";
import { SectionHeader, gridColumns } from "./shell";

/**
 * Renderers for the section library.
 *
 * One component per `SectionType`. Each reads its values through the typed
 * accessors in `@/lib/cms/section-data`, so a field an administrator has
 * cleared, or one added to the library after the record was written, degrades
 * to an empty state instead of throwing.
 *
 * Collection sections (articles, FAQ, team, testimonials) never
 * query anything themselves — the page renderer fetches once and passes the
 * results down, which keeps a page with six collection sections at one round
 * of queries rather than six.
 */

export interface SectionContext {
  settings: SiteSettings;
  articles: Article[];
  faqs: FaqItem[];
  team: Arbitrator[];
  testimonials: Testimonial[];
  categories: Category[];
  csrfToken: string;
}

export interface BlockProps {
  section: PageSection;
  context: SectionContext;
}

const onDarkOf = (section: PageSection) => section.background === "navy";

/** The optional "view all" link most collection sections carry. */
function SectionAction({
  data,
  onDark,
}: {
  data: SectionData;
  onDark: boolean;
}) {
  const target = link(data, "linkText", "linkUrl");
  if (!target) return null;

  return (
    <Link
      href={target.href}
      className={cn(
        "link-underline group text-[0.9375rem] font-semibold",
        onDark ? "text-gold-200 hover:text-gold-100" : "text-navy-800 hover:text-navy-950",
      )}
    >
      <span>{target.label}</span>
      <Icon
        name="arrow-forward"
        size={16}
        className="transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:-translate-x-1"
      />
    </Link>
  );
}

/* ========================================================================== */
/*  Hero                                                                      */
/* ========================================================================== */

export function HeroBlock({ section, context }: BlockProps) {
  const { data } = section;
  const layout = str(data, "layout", "split");
  const alignment = str(data, "alignment", "start");
  const image = str(data, "image");
  const video = str(data, "backgroundVideo");
  const overlay = Math.min(90, Math.max(0, num(data, "overlay", 55)));
  const assurances = rows(data, "assurances");
  const heading = str(data, "heading");
  const subtitle = str(data, "subtitle");
  const description = str(data, "description");
  const eyebrow = str(data, "eyebrow", context.settings.institutionName);

  const primary = link(data, "primaryButtonText", "primaryButtonUrl");
  const secondary = link(data, "secondaryButtonText", "secondaryButtonUrl");
  const onDark = onDarkOf(section) || layout === "centered";

  const copy = (
    <>
      {eyebrow && (
        <p className={cn("eyebrow", onDark && "eyebrow-on-dark")}>{eyebrow}</p>
      )}

      {heading && (
        <h1
          className={cn(
            "display-1 mt-6 max-w-2xl",
            onDark ? "text-white" : "text-navy-950",
            alignment === "center" && "mx-auto text-center",
          )}
        >
          {heading}
          {subtitle && (
            <span
              className={cn(
                "mt-1 block",
                onDark ? "text-white/70" : "text-navy-600",
              )}
            >
              {subtitle}
            </span>
          )}
        </h1>
      )}

      {description && (
        <p
          className={cn(
            "lead mt-7 max-w-xl",
            onDark && "lead-on-dark",
            alignment === "center" && "mx-auto text-center",
          )}
        >
          {description}
        </p>
      )}

      {(primary || secondary) && (
        <div
          className={cn(
            "mt-9 flex flex-col gap-3 sm:flex-row sm:items-center",
            alignment === "center" && "sm:justify-center",
          )}
        >
          {primary && (
            <ButtonLink
              href={primary.href}
              variant={onDark ? "accent" : "primary"}
              size="lg"
              iconEnd="arrow-forward"
              className="sm:min-w-[13.5rem]"
            >
              {primary.label}
            </ButtonLink>
          )}
          {secondary && (
            <ButtonLink
              href={secondary.href}
              variant={onDark ? "outline-light" : "outline"}
              size="lg"
              className="sm:min-w-[13.5rem]"
            >
              {secondary.label}
            </ButtonLink>
          )}
        </div>
      )}

      {assurances.length > 0 && (
        <ul
          className={cn(
            "mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-7 sm:gap-y-3",
            alignment === "center" && "sm:justify-center",
          )}
        >
          {assurances.map((item, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2.5 text-[0.875rem]",
                onDark ? "text-white/75" : "text-ink-2",
              )}
            >
              <Icon
                name={(str(item, "icon") || "check-circle") as IconName}
                size={17}
                className={onDark ? "text-gold-300" : "text-gold-600"}
              />
              {str(item, "label")}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  /* -- full-bleed banner ------------------------------------------------- */
  if (layout === "centered") {
    return (
      <div className="relative isolate overflow-hidden">
        {video ? (
          <video
            className="absolute inset-0 -z-10 size-full object-cover"
            src={video}
            poster={image || undefined}
            autoPlay
            muted
            loop
            playsInline
            // Decorative background: never announced, never focusable.
            aria-hidden="true"
          />
        ) : image ? (
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
        ) : (
          <div className="absolute inset-0 -z-10 bg-navy-900" />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-navy-950"
          style={{ opacity: overlay / 100 }}
        />

        <div className="container-x py-20 md:py-28 lg:py-36">
          <div className={cn(alignment === "center" && "text-center")}>{copy}</div>
        </div>
      </div>
    );
  }

  /* -- minimal ----------------------------------------------------------- */
  if (layout === "minimal" || (!image && !video)) {
    return <div className={cn(alignment === "center" && "text-center")}>{copy}</div>;
  }

  /* -- editorial split --------------------------------------------------- */
  return (
    <div className="grid items-stretch gap-y-10 lg:grid-cols-12 lg:gap-x-12">
      <div className="flex flex-col justify-center lg:col-span-7">{copy}</div>

      <div className="relative -mx-5 sm:-mx-8 lg:col-span-5 lg:mx-0">
        <div className="relative h-[15rem] overflow-hidden sm:h-[19rem] lg:h-full lg:min-h-[30rem]">
          {video ? (
            <video
              className="absolute inset-0 size-full object-cover"
              src={video}
              poster={image || undefined}
              autoPlay
              muted
              loop
              playsInline
              aria-hidden="true"
            />
          ) : image ? (
            <Image
              src={image}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />
          ) : (
            <HeroVisual className="absolute inset-0 object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Text + image                                                              */
/* ========================================================================== */

export function TextImageBlock({ section }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const image = str(data, "image");
  const caption = str(data, "imageCaption");
  const body = str(data, "body");
  const imageFirst = str(data, "imagePosition", "end") === "start";
  const target = link(data, "linkText", "linkUrl");

  return (
    <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
      <div className={cn("lg:col-span-6", imageFirst && "lg:order-2")}>
        <SectionHeader data={{ ...data, description: "" }} onDark={onDark} />

        {str(data, "description") && (
          <p className={cn("lead mt-6", onDark && "lead-on-dark")}>
            {str(data, "description")}
          </p>
        )}

        {body && (
          <div className={cn("mt-6", onDark && "text-white/70")}>
            <RichText source={body} className="prose-fa" />
          </div>
        )}

        {target && (
          <div className="mt-8">
            <SectionAction data={data} onDark={onDark} />
          </div>
        )}
      </div>

      <figure className={cn("lg:col-span-6", imageFirst && "lg:order-1")}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={caption || ""}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <HeroVisual className="absolute inset-0 object-cover" />
          )}
        </div>
        {caption && (
          <figcaption
            className={cn(
              "mt-3 text-[0.8125rem]",
              onDark ? "text-white/50" : "text-muted",
            )}
          >
            {caption}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

/* ========================================================================== */
/*  Rich text                                                                 */
/* ========================================================================== */

export function RichTextBlock({ section }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const narrow = bool(data, "narrow", true);
  const body = str(data, "body");

  return (
    <div className={cn(narrow && "mx-auto max-w-3xl")}>
      <SectionHeader data={data} onDark={onDark} />
      {body && (
        <div className={cn("mt-8", onDark && "text-white/70")}>
          <RichText source={body} className="prose-fa" />
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/*  Cards                                                                     */
/* ========================================================================== */

export function CardsBlock({ section }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const items = rows(data, "items");
  const numbered = bool(data, "numbered");

  if (!items.length) return <EmptyNotice onDark={onDark} label="کارتی ثبت نشده است." />;

  return (
    <>
      <SectionHeader data={data} onDark={onDark} />

      <ul
        className={cn(
          "mt-12 grid gap-px",
          onDark ? "bg-white/10" : "border border-line bg-line",
          gridColumns(columns(data)),
        )}
      >
        {items.map((item, index) => {
          const title = str(item, "title");
          const description = str(item, "description");
          const icon = str(item, "icon");
          const image = str(item, "image");
          const target = link(item, "linkText", "linkUrl");

          const body = (
            <>
              {image ? (
                <div className="relative mb-6 aspect-[16/10] overflow-hidden">
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ) : icon ? (
                <span
                  className={cn(
                    "flex size-11 items-center justify-center border transition-colors duration-400",
                    onDark
                      ? "border-white/15 text-gold-300"
                      : "border-line-2 text-navy-700 group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-gold-200",
                  )}
                >
                  <Icon name={icon as IconName} size={21} />
                </span>
              ) : numbered ? (
                <span
                  aria-hidden="true"
                  className="text-[0.6875rem] font-semibold tabular-nums text-gold-600"
                >
                  {fa(String(index + 1).padStart(2, "0"))}
                </span>
              ) : null}

              {title && (
                <h3
                  className={cn(
                    "mt-6 text-[1.0625rem] font-bold",
                    onDark ? "text-white" : "text-navy-900",
                  )}
                >
                  {title}
                </h3>
              )}

              {description && (
                <p
                  className={cn(
                    "mt-3 flex-1 text-[0.875rem] leading-[2]",
                    onDark ? "text-white/55" : "text-muted",
                  )}
                >
                  {description}
                </p>
              )}

              {target && (
                <span
                  className={cn(
                    "mt-5 inline-flex items-center gap-2 text-[0.8125rem] font-semibold",
                    onDark ? "text-gold-200" : "text-navy-800",
                  )}
                >
                  {target.label}
                  <Icon
                    name="arrow-forward"
                    size={15}
                    className="transition-transform duration-400 group-hover:-translate-x-1"
                  />
                </span>
              )}
            </>
          );

          const cellClass = cn(
            "group flex h-full flex-col p-6 transition-colors duration-400 lg:p-7",
            onDark ? "bg-navy-900 hover:bg-navy-800" : "bg-white hover:bg-paper-2/60",
          );

          return (
            <Reveal as="li" key={index} delay={index * 60} className="flex">
              {target ? (
                <Link href={target.href} className={cellClass}>
                  {body}
                </Link>
              ) : (
                <div className={cellClass}>{body}</div>
              )}
            </Reveal>
          );
        })}
      </ul>
    </>
  );
}

/* ========================================================================== */
/*  Features                                                                  */
/* ========================================================================== */

export function FeaturesBlock({ section }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const items = rows(data, "items");

  if (!items.length) return <EmptyNotice onDark={onDark} label="ویژگی‌ای ثبت نشده است." />;

  return (
    <>
      <SectionHeader data={data} onDark={onDark} />

      <ul
        className={cn(
          "grid gap-x-8 gap-y-8",
          str(data, "heading") || str(data, "eyebrow") ? "mt-12" : "",
          gridColumns(columns(data)),
        )}
      >
        {items.map((item, index) => (
          <Reveal
            as="li"
            key={index}
            delay={index * 60}
            className="flex items-start gap-3.5"
          >
            <Icon
              name={(str(item, "icon") || "check-circle") as IconName}
              size={20}
              className={cn("mt-1 shrink-0", onDark ? "text-gold-400" : "text-gold-600")}
            />
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[0.9375rem] font-semibold",
                  onDark ? "text-white" : "text-navy-900",
                )}
              >
                {str(item, "title")}
              </p>
              {str(item, "description") && (
                <p
                  className={cn(
                    "mt-1.5 text-[0.8125rem] leading-[1.95]",
                    onDark ? "text-white/55" : "text-muted",
                  )}
                >
                  {str(item, "description")}
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </ul>
    </>
  );
}

/* ========================================================================== */
/*  Statistics                                                                */
/* ========================================================================== */

export function StatsBlock({ section }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const items = rows(data, "items");

  if (!items.length) {
    return (
      <EmptyNotice
        onDark={onDark}
        label="آماری ثبت نشده است. اعداد این بخش از پنل مدیریت وارد می‌شوند."
      />
    );
  }

  return (
    <>
      <SectionHeader data={data} onDark={onDark} align="center" />

      <dl
        className={cn(
          "grid gap-px",
          str(data, "heading") ? "mt-12" : "",
          onDark ? "bg-white/10" : "border border-line bg-line",
          items.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3",
        )}
      >
        {items.map((item, index) => {
          const raw = str(item, "value");
          // A purely numeric figure counts up; anything else (a range, a
          // Persian word) is shown as written.
          const numeric = Number(raw.replace(/[^\d.]/g, ""));
          const isNumeric = raw !== "" && Number.isFinite(numeric) && /\d/.test(raw);

          return (
            <div
              key={index}
              className={cn(
                "flex flex-col items-center p-8 text-center",
                onDark ? "bg-navy-900" : "bg-white",
              )}
            >
              <dd
                className={cn(
                  "text-[2.25rem] font-bold leading-none tabular-nums",
                  onDark ? "text-white" : "text-navy-950",
                )}
              >
                {isNumeric ? (
                  <Counter value={numeric} suffix={str(item, "suffix")} />
                ) : (
                  <>
                    {raw}
                    {str(item, "suffix")}
                  </>
                )}
              </dd>
              <dt
                className={cn(
                  "mt-3 text-[0.9375rem] font-semibold",
                  onDark ? "text-gold-300" : "text-navy-800",
                )}
              >
                {str(item, "label")}
              </dt>
              {str(item, "description") && (
                <p
                  className={cn(
                    "mt-2 text-[0.8125rem] leading-[1.9]",
                    onDark ? "text-white/50" : "text-muted",
                  )}
                >
                  {str(item, "description")}
                </p>
              )}
            </div>
          );
        })}
      </dl>
    </>
  );
}

/* ========================================================================== */
/*  Testimonials                                                              */
/* ========================================================================== */

export function TestimonialsBlock({ section, context }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const items = context.testimonials.slice(0, num(data, "limit", 3));
  const showRating = bool(data, "showRating", true);

  if (!items.length) {
    return (
      <EmptyNotice
        onDark={onDark}
        label="هنوز نظری ثبت نشده است. نظرات از بخش «نظرات» در پنل مدیریت اضافه می‌شوند."
      />
    );
  }

  return (
    <>
      <SectionHeader data={data} onDark={onDark} />

      <ul
        className={cn(
          "mt-12 grid gap-px",
          onDark ? "bg-white/10" : "border border-line bg-line",
          items.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {items.map((testimonial, index) => (
          <Reveal
            as="li"
            key={testimonial.id}
            delay={index * 70}
            className={cn(
              "flex flex-col p-7 lg:p-8",
              onDark ? "bg-navy-900" : "bg-white",
            )}
          >
            <Icon
              name="quote"
              size={26}
              className={onDark ? "text-gold-400/60" : "text-gold-400"}
            />

            {showRating && testimonial.rating > 0 && (
              <div
                className="mt-4 flex items-center gap-1"
                aria-label={`امتیاز ${fa(testimonial.rating)} از ۵`}
              >
                {Array.from({ length: 5 }).map((_, star) => (
                  <Icon
                    key={star}
                    name={star < testimonial.rating ? "star-filled" : "star"}
                    size={15}
                    className={
                      star < testimonial.rating
                        ? "text-gold-500"
                        : onDark
                          ? "text-white/20"
                          : "text-line-2"
                    }
                  />
                ))}
              </div>
            )}

            <blockquote
              className={cn(
                "mt-5 flex-1 text-[0.9375rem] leading-[2.1]",
                onDark ? "text-white/70" : "text-ink-2",
              )}
            >
              {testimonial.quote}
            </blockquote>

            <figcaption
              className={cn(
                "mt-6 flex items-center gap-3 border-t pt-5",
                onDark ? "border-white/10" : "border-line",
              )}
            >
              {testimonial.photoUrl ? (
                <Image
                  src={testimonial.photoUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover"
                />
              ) : (
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full text-[0.875rem] font-bold",
                    onDark ? "bg-white/10 text-gold-200" : "bg-navy-900 text-gold-200",
                  )}
                >
                  {testimonial.authorName.trim().slice(0, 1)}
                </span>
              )}
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[0.9375rem] font-semibold",
                    onDark ? "text-white" : "text-navy-900",
                  )}
                >
                  {testimonial.authorName}
                </span>
                {testimonial.authorTitle && (
                  <span
                    className={cn(
                      "block text-[0.8125rem]",
                      onDark ? "text-white/50" : "text-muted",
                    )}
                  >
                    {testimonial.authorTitle}
                  </span>
                )}
              </span>
            </figcaption>
          </Reveal>
        ))}
      </ul>
    </>
  );
}

/* ========================================================================== */
/*  FAQ                                                                       */
/* ========================================================================== */

export function FaqBlock({ section, context }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const topic = str(data, "topic");

  const items = context.faqs
    .filter((faq) => !topic || faq.topic === topic)
    .slice(0, num(data, "limit", 6));

  if (!items.length) {
    return <EmptyNotice onDark={onDark} label="پرسشی برای نمایش ثبت نشده است." />;
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-4">
        <SectionHeader data={data} onDark={onDark} className="md:flex-col md:items-start" />
        <div className="mt-6">
          <SectionAction data={data} onDark={onDark} />
        </div>
      </div>

      <div className="lg:col-span-8">
        <Accordion
          items={items.map((faq) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
          }))}
          defaultOpenId={items[0]?.id}
          numbered
        />
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Gallery                                                                   */
/* ========================================================================== */

export function GalleryBlock({ section }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const items = rows(data, "items").filter((item) => str(item, "image"));

  if (!items.length) {
    return <EmptyNotice onDark={onDark} label="تصویری به گالری اضافه نشده است." />;
  }

  return (
    <>
      <SectionHeader data={data} onDark={onDark} />

      <ul
        className={cn(
          "mt-12 grid gap-4",
          gridColumns(columns(data)),
        )}
      >
        {items.map((item, index) => {
          const image = str(item, "image");
          const caption = str(item, "caption");
          const href = str(item, "linkUrl");

          const figure = (
            <figure className="group">
              <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
                <Image
                  src={image}
                  alt={caption}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]"
                />
              </div>
              {caption && (
                <figcaption
                  className={cn(
                    "mt-2.5 text-[0.8125rem]",
                    onDark ? "text-white/55" : "text-muted",
                  )}
                >
                  {caption}
                </figcaption>
              )}
            </figure>
          );

          return (
            <Reveal as="li" key={index} delay={index * 50}>
              {href ? <Link href={href}>{figure}</Link> : figure}
            </Reveal>
          );
        })}
      </ul>
    </>
  );
}

/* ========================================================================== */
/*  Team                                                                      */
/* ========================================================================== */

export function TeamBlock({ section, context }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const items = context.team.slice(0, num(data, "limit", 4));
  const showBio = bool(data, "showBio", true);

  if (!items.length) {
    return (
      <EmptyNotice
        onDark={onDark}
        label="پروفایلی ثبت نشده است. اعضا از بخش «داوران و اعضا» اضافه می‌شوند."
      />
    );
  }

  return (
    <>
      <SectionHeader
        data={data}
        onDark={onDark}
        action={<SectionAction data={data} onDark={onDark} />}
      />

      <ul
        className={cn(
          "mt-12 grid gap-px",
          onDark ? "bg-white/10" : "border border-line bg-line",
          items.length === 1 ? "" : gridColumns(columns(data)),
        )}
      >
        {items.map((person, index) => (
          <Reveal
            as="li"
            key={person.id}
            delay={index * 70}
            className={cn(
              "flex flex-col gap-6 p-7 sm:flex-row lg:p-8",
              onDark ? "bg-navy-900" : "bg-white",
            )}
          >
            <div className="w-full max-w-[9rem] shrink-0">
              <Portrait
                fullName={person.fullName}
                photoUrl={person.photoUrl}
                priority={index === 0}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  "text-[1.125rem] font-bold",
                  onDark ? "text-white" : "text-navy-900",
                )}
              >
                {person.fullName}
              </h3>
              <p
                className={cn(
                  "mt-1 text-[0.875rem]",
                  onDark ? "text-gold-300" : "text-gold-600",
                )}
              >
                {person.title}
              </p>

              {showBio && person.shortBio && (
                <p
                  className={cn(
                    "mt-4 text-[0.875rem] leading-[2]",
                    onDark ? "text-white/60" : "text-muted",
                  )}
                >
                  {person.shortBio}
                </p>
              )}

              {person.expertise.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {person.expertise.slice(0, 4).map((skill) => (
                    <li
                      key={skill}
                      className={cn(
                        "rounded-xs border px-2.5 py-1 text-[0.75rem]",
                        onDark
                          ? "border-white/15 text-white/65"
                          : "border-line-2 text-ink-2",
                      )}
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href={arbitratorPublicHref(person.slug, index === 0)}
                className={cn(
                  "link-underline group mt-5 inline-flex text-[0.875rem] font-semibold",
                  onDark ? "text-gold-200" : "text-navy-800",
                )}
              >
                <span>مشاهده پروفایل</span>
                <Icon
                  name="arrow-forward"
                  size={15}
                  className="transition-transform duration-400 group-hover:-translate-x-1"
                />
              </Link>
            </div>
          </Reveal>
        ))}
      </ul>
    </>
  );
}

/* ========================================================================== */
/*  Timeline                                                                  */
/* ========================================================================== */

export function TimelineBlock({ section }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const items = rows(data, "items");

  if (!items.length) {
    return <EmptyNotice onDark={onDark} label="مرحله‌ای ثبت نشده است." />;
  }

  return (
    <>
      <SectionHeader data={data} onDark={onDark} />

      <ol className="mt-12 grid gap-px md:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <Reveal
            as="li"
            key={index}
            delay={index * 60}
            className={cn(
              "relative flex flex-col border-t-2 p-6 lg:p-7",
              onDark ? "border-gold-400/40" : "border-navy-900",
            )}
          >
            <span
              className={cn(
                "text-[0.75rem] font-semibold tabular-nums",
                onDark ? "text-gold-300" : "text-gold-600",
              )}
            >
              {str(item, "marker") || fa(String(index + 1).padStart(2, "0"))}
            </span>
            <h3
              className={cn(
                "mt-3 text-[1rem] font-bold",
                onDark ? "text-white" : "text-navy-900",
              )}
            >
              {str(item, "title")}
            </h3>
            <p
              className={cn(
                "mt-2.5 text-[0.875rem] leading-[2]",
                onDark ? "text-white/55" : "text-muted",
              )}
            >
              {str(item, "description")}
            </p>
          </Reveal>
        ))}
      </ol>
    </>
  );
}

/* ========================================================================== */
/*  CTA                                                                       */
/* ========================================================================== */

export function CtaBlock({ section, context }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const heading = str(data, "heading");
  const description = str(data, "description");
  const primary = link(data, "primaryButtonText", "primaryButtonUrl");
  const secondary = link(data, "secondaryButtonText", "secondaryButtonUrl");
  const phone = str(data, "phone") || context.settings.phones[0];
  const align = str(data, "alignment", "center");

  return (
    <div
      className={cn(
        "flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between",
        align === "center" && "lg:flex-col lg:text-center",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "lg:mx-auto")}>
        {str(data, "eyebrow") && (
          <p className={cn("eyebrow", onDark && "eyebrow-on-dark")}>
            {str(data, "eyebrow")}
          </p>
        )}
        {heading && (
          <h2
            className={cn(
              "mt-4 text-[1.5rem] font-bold leading-[1.6] sm:text-[1.875rem]",
              onDark ? "text-white" : "text-navy-950",
            )}
          >
            {heading}
          </h2>
        )}
        {description && (
          <p
            className={cn(
              "mt-4 text-[0.9375rem] leading-[2.1]",
              onDark ? "text-white/65" : "text-muted",
            )}
          >
            {description}
          </p>
        )}
      </div>

      <div
        className={cn(
          "flex shrink-0 flex-col gap-3 sm:flex-row",
          align === "center" && "lg:justify-center",
        )}
      >
        {primary && (
          <ButtonLink
            href={primary.href}
            variant={onDark ? "accent" : "primary"}
            size="lg"
            iconEnd="arrow-forward"
            className="sm:min-w-[12.5rem]"
          >
            {primary.label}
          </ButtonLink>
        )}
        {secondary && (
          <ButtonLink
            href={secondary.href}
            variant={onDark ? "outline-light" : "outline"}
            size="lg"
            className="sm:min-w-[12.5rem]"
          >
            {secondary.label}
          </ButtonLink>
        )}
        {!primary && !secondary && phone && (
          <a
            href={`tel:${phone}`}
            className={cn(
              "flex items-center gap-2 text-[0.9375rem] font-semibold",
              onDark ? "text-gold-200" : "text-navy-800",
            )}
          >
            <Icon name="phone" size={17} />
            <span dir="ltr">{faPhone(phone)}</span>
          </a>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Articles                                                                  */
/* ========================================================================== */

export function ArticlesBlock({ section, context }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const category = str(data, "category");
  const featuredOnly = bool(data, "featuredOnly");

  const items = context.articles
    .filter((article) => !category || article.category === category)
    .filter((article) => !featuredOnly || article.featured)
    .slice(0, num(data, "limit", 3));

  if (!items.length) {
    return <EmptyNotice onDark={onDark} label="مقاله‌ای برای نمایش منتشر نشده است." />;
  }

  const categoryTitle = (slug: string) =>
    context.categories.find((entry) => entry.slug === slug)?.title ?? slug;

  return (
    <>
      <SectionHeader
        data={data}
        onDark={onDark}
        action={<SectionAction data={data} onDark={onDark} />}
      />

      <div
        className={cn(
          "mt-12 grid gap-px",
          onDark ? "bg-white/10" : "border border-line bg-line",
          items.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {items.map((article, index) => (
          <Reveal key={article.id} delay={index * 70} className="flex">
            <ArticleCard
              article={article}
              categoryTitle={categoryTitle(article.category)}
              className="w-full"
            />
          </Reveal>
        ))}
      </div>
    </>
  );
}

/* ========================================================================== */
/*  Contact                                                                   */
/* ========================================================================== */

export function ContactBlock({ section, context }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const { settings } = context;

  const details: { icon: IconName; label: string; value: React.ReactNode }[] = [];

  if (bool(data, "showAddress", true) && settings.address) {
    details.push({ icon: "map-pin", label: "نشانی", value: settings.address });
  }
  if (bool(data, "showPhones", true) && settings.phones.length) {
    details.push({
      icon: "phone",
      label: "تلفن",
      value: (
        <span className="flex flex-col gap-1">
          {settings.phones.map((phone) => (
            <a key={phone} href={`tel:${phone}`} dir="ltr" className="text-start">
              {faPhone(phone)}
            </a>
          ))}
        </span>
      ),
    });
  }
  if (bool(data, "showEmail", true) && settings.email) {
    details.push({
      icon: "mail",
      label: "ایمیل",
      value: (
        <a href={`mailto:${settings.email}`} dir="ltr" className="text-start">
          {settings.email}
        </a>
      ),
    });
  }
  if (bool(data, "showHours", true) && settings.workingHours.length) {
    details.push({
      icon: "clock",
      label: "ساعات کاری",
      value: (
        <span className="flex flex-col gap-1">
          {settings.workingHours.map((hour) => (
            <span key={hour.label}>
              {hour.label}: {hour.value}
            </span>
          ))}
        </span>
      ),
    });
  }

  const showForm = bool(data, "showForm", true);

  return (
    <>
      <SectionHeader data={data} onDark={onDark} />

      <div
        className={cn(
          "mt-12 grid gap-12",
          showForm && "lg:grid-cols-12 lg:gap-16",
        )}
      >
        <div className={cn(showForm && "lg:col-span-5")}>
          <ul className="flex flex-col gap-6">
            {details.map((detail) => (
              <li key={detail.label} className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center border",
                    onDark
                      ? "border-white/15 text-gold-300"
                      : "border-line-2 text-navy-700",
                  )}
                >
                  <Icon name={detail.icon} size={18} />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[0.75rem]",
                      onDark ? "text-white/45" : "text-muted-2",
                    )}
                  >
                    {detail.label}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[0.9375rem] leading-[2]",
                      onDark ? "text-white/80" : "text-ink-2",
                    )}
                  >
                    {detail.value}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {bool(data, "showSocials", true) && settings.socials.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              {settings.socials.map((social) => {
                const meta = SOCIAL_PLATFORM[social.platform];
                return (
                  <a
                    key={`${social.platform}-${social.url}`}
                    href={social.url}
                    aria-label={social.label || meta?.label}
                    rel="noopener noreferrer"
                    target="_blank"
                    className={cn(
                      "flex size-10 items-center justify-center rounded-sm border transition-colors",
                      onDark
                        ? "border-white/12 text-white/70 hover:text-gold-200"
                        : "border-line-2 text-navy-700 hover:border-navy-900 hover:bg-navy-900 hover:text-gold-200",
                    )}
                  >
                    <Icon name={meta?.icon ?? "globe"} size={17} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {showForm && (
          <div className="lg:col-span-7">
            <ContactForm csrfToken={context.csrfToken} />
          </div>
        )}
      </div>
    </>
  );
}

/* ========================================================================== */
/*  Map                                                                       */
/* ========================================================================== */

export function MapBlock({ section, context }: BlockProps) {
  const { data } = section;
  const onDark = onDarkOf(section);
  const embedUrl = str(data, "embedUrl") || context.settings.mapEmbedUrl;
  const height = Math.min(800, Math.max(200, num(data, "height", 420)));

  if (!embedUrl) {
    return <EmptyNotice onDark={onDark} label="نشانی نقشه در تنظیمات سایت ثبت نشده است." />;
  }

  return (
    <>
      {str(data, "heading") && (
        <h2 className={cn("display-3 mb-8", onDark && "text-white")}>
          {str(data, "heading")}
        </h2>
      )}

      <div className="overflow-hidden border border-line bg-paper-2">
        <iframe
          src={embedUrl}
          title={`نقشه محل ${context.settings.institutionName}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full border-0"
          style={{ height }}
        />
      </div>

      {bool(data, "showAddress", true) && context.settings.address && (
        <p
          className={cn(
            "mt-4 flex items-start gap-2.5 text-[0.875rem]",
            onDark ? "text-white/60" : "text-muted",
          )}
        >
          <Icon name="map-pin" size={17} className="mt-0.5 shrink-0 text-gold-600" />
          {context.settings.address}
        </p>
      )}
    </>
  );
}

/* ========================================================================== */
/*  Custom HTML                                                               */
/* ========================================================================== */

/**
 * Administrator-supplied markup.
 *
 * Rendered verbatim, which is the entire point of the section — an embed code
 * that has been sanitised is an embed code that no longer works. The
 * protection is authorisation, not escaping: only a signed-in content role can
 * create one, and the editor labels it as advanced.
 */
export function CustomHtmlBlock({ section }: BlockProps) {
  const { data } = section;
  const html = str(data, "html");
  if (!html) return null;

  const content = (
    <div
      className="cms-custom-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  return (
    <>
      {str(data, "heading") && (
        <h2
          className={cn("display-3 mb-8", onDarkOf(section) && "text-white")}
        >
          {str(data, "heading")}
        </h2>
      )}
      {content}
    </>
  );
}

/* ========================================================================== */
/*  Empty state                                                               */
/* ========================================================================== */

/**
 * What a collection section shows when it has nothing to show.
 *
 * Deliberately quiet and never alarming: an empty FAQ section on a live site
 * is an editorial gap, not an error, and the message names where to fill it.
 */
function EmptyNotice({ label, onDark }: { label: string; onDark: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 rounded-sm border border-dashed px-6 py-12 text-center text-[0.875rem]",
        onDark ? "border-white/15 text-white/50" : "border-line-2 text-muted",
      )}
    >
      <Icon name="info" size={17} className="shrink-0" />
      {label}
    </div>
  );
}
