import type { Arbitrator } from "@/types";

const TS = { createdAt: "2024-02-05T08:00:00.000Z", updatedAt: "2026-05-20T08:00:00.000Z" };

/**
 * The institution's arbitrator.
 *
 * The organisation has exactly ONE arbitrator. This array is a collection only
 * because the CMS edits records generically — it must not be read as a roster.
 * Do not add illustrative colleagues, "team members" or sample profiles here.
 *
 * ⚠️ NOTHING BELOW IS INVENTED. Every biographical field the institution has
 * not supplied is left empty on purpose: the profile page renders a clearly
 * marked "pending" block for empty sections instead of plausible-sounding
 * filler. Fill them in from `/admin/arbitrators` once the real details are
 * available — no code change is needed.
 *
 * `photoUrl` is intentionally unset: until a real portrait is uploaded the UI
 * renders a designed monogram plate (`<Portrait/>`) rather than stock imagery.
 */
export const SEED_ARBITRATORS: Arbitrator[] = [
  {
    id: "arb-karimi-mazidi",
    slug: "ahmad-karimi-mazidi",
    fullName: "احمد کریمی مزیدی",
    title: "داور مؤسسه",

    /* معرفی — supplied text goes here. */
    shortBio: "",
    biography: "",

    /* تخصص‌ها */
    expertise: [],

    /* حوزه‌های فعالیت */
    practiceAreas: [],

    /* رویکرد حرفه‌ای */
    approach: "",

    languages: [],
    /** `0` = not supplied. The UI hides the field rather than showing a zero. */
    yearsOfExperience: 0,
    education: [],
    background: [],
    memberships: [],

    order: 1,
    bookable: true,
    published: true,

    /**
     * Describes the page itself — it makes no claim about qualifications,
     * so it is safe to ship before the biography is written.
     */
    seo: {
      metaTitle: "احمد کریمی مزیدی | داور مؤسسه",
      metaDescription:
        "پروفایل حرفه‌ای احمد کریمی مزیدی، داور مؤسسه؛ معرفی، حوزه‌های فعالیت، رویکرد حرفه‌ای و راه‌های ارتباط برای ارجاع پرونده داوری.",
    },
    ...TS,
  },
];

/** The single arbitrator's record id — used by seed fixtures. */
export const PRINCIPAL_ARBITRATOR_ID = SEED_ARBITRATORS[0].id;

/** The single arbitrator's name — used by seed fixtures. */
export const PRINCIPAL_ARBITRATOR_NAME = SEED_ARBITRATORS[0].fullName;
