import type { ComponentType } from "react";
import type { PageSection, SectionType } from "@/types";
import { SectionShell } from "./shell";
import {
  ArticlesBlock,
  CardsBlock,
  ContactBlock,
  CtaBlock,
  CustomHtmlBlock,
  FaqBlock,
  FeaturesBlock,
  GalleryBlock,
  HeroBlock,
  MapBlock,
  RichTextBlock,
  StatsBlock,
  TeamBlock,
  TestimonialsBlock,
  TextImageBlock,
  TimelineBlock,
  type BlockProps,
  type SectionContext,
} from "./blocks";

export type { SectionContext } from "./blocks";

/**
 * Section type → renderer.
 *
 * The one place the library's types meet their components. A record rather
 * than a switch so TypeScript fails the build if a type is added to
 * `SectionType` without a renderer, instead of that section silently
 * disappearing from every page that uses it.
 */
const BLOCKS: Record<SectionType, ComponentType<BlockProps>> = {
  hero: HeroBlock,
  "text-image": TextImageBlock,
  "rich-text": RichTextBlock,
  cards: CardsBlock,
  features: FeaturesBlock,
  stats: StatsBlock,
  testimonials: TestimonialsBlock,
  faq: FaqBlock,
  gallery: GalleryBlock,
  team: TeamBlock,
  timeline: TimelineBlock,
  cta: CtaBlock,
  articles: ArticlesBlock,
  contact: ContactBlock,
  map: MapBlock,
  "custom-html": CustomHtmlBlock,
};

/**
 * Renders one page's sections.
 *
 * Hidden sections are dropped here rather than inside each block, and a
 * section whose type is no longer in the library is skipped rather than
 * crashing the page — an administrator downgrading a deployment should lose a
 * section, not the whole site.
 */
export function SectionRenderer({
  sections,
  context,
  /** Admin preview: renders hidden sections too, marked as such. */
  preview = false,
}: {
  sections: PageSection[];
  context: SectionContext;
  preview?: boolean;
}) {
  const ordered = [...sections].sort((a, b) => a.order - b.order);

  return (
    <>
      {ordered.map((section) => {
        if (!section.visible && !preview) return null;

        const Block = BLOCKS[section.type];
        if (!Block) return null;

        const bleed =
          section.type === "hero" && section.data.layout === "centered";

        return (
          <SectionShell
            key={section.id}
            section={section}
            bleed={bleed}
            className={
              !section.visible && preview
                ? "relative opacity-60 outline-2 -outline-offset-2 outline-dashed outline-warning"
                : undefined
            }
          >
            {!section.visible && preview && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-sm bg-warning-soft px-3 py-1.5 text-[0.75rem] font-semibold text-warning">
                این بخش در وب‌سایت پنهان است
              </p>
            )}
            <Block section={section} context={context} />
          </SectionShell>
        );
      })}
    </>
  );
}
