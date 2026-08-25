import type { Category, MediaAsset, Testimonial } from "@/types";
import { DEFAULT_CATEGORY_SEEDS } from "./defaults";

/**
 * Seeds for the collections introduced with the CMS.
 *
 * Two of them ship deliberately empty:
 *
 *  • **Testimonials.** A testimonial is a claim that a named person said
 *    something about this institution. Inventing them to fill a section is
 *    not acceptable, so the section renders its empty state until real ones
 *    are entered.
 *
 *  • **Media.** The library indexes files an administrator has actually
 *    uploaded. The eight geometric covers shipped in `public/covers` are
 *    registered below so they are selectable from day one, but nothing is
 *    fabricated beyond what exists on disk.
 */

const SEED_TIME = "2026-06-01T08:00:00.000Z";

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

export const SEED_CATEGORIES: Category[] = DEFAULT_CATEGORY_SEEDS.map(
  (category, index) => ({
    id: `cat-${category.slug}`,
    slug: category.slug,
    title: category.title,
    description: category.description,
    order: index,
    published: true,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  }),
);

/* -------------------------------------------------------------------------- */
/*  Media                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The brand cover plates that ship in `public/`.
 *
 * Registering them means an editor can pick an article cover from the media
 * picker on a fresh install instead of being forced to upload something first.
 * They are marked as shipped assets so the library can refuse to delete a file
 * it does not own on disk.
 */
const SHIPPED_COVERS = [
  "geometry-01",
  "geometry-02",
  "geometry-03",
  "geometry-04",
  "geometry-05",
  "geometry-06",
  "geometry-07",
  "geometry-08",
];

export const SEED_MEDIA: MediaAsset[] = SHIPPED_COVERS.map((name, index) => ({
  id: `media-${name}`,
  fileName: `${name}.svg`,
  title: `طرح هندسی ${index + 1}`,
  alt: "طرح گرافیکی انتزاعی با خطوط معماری",
  mimeType: "image/svg+xml",
  kind: "image" as const,
  size: 0,
  width: 1200,
  height: 800,
  url: `/covers/${name}.svg`,
  uploadedByName: "پیش‌فرض سامانه",
  createdAt: SEED_TIME,
  updatedAt: SEED_TIME,
}));

/* -------------------------------------------------------------------------- */
/*  Testimonials                                                              */
/* -------------------------------------------------------------------------- */

/** Intentionally empty — see the note at the top of this file. */
export const SEED_TESTIMONIALS: Testimonial[] = [];
