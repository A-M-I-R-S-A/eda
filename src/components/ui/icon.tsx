import type { SVGProps } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A single hand-built line-icon set.
 *
 * Shipping one registry instead of an icon package keeps the bundle small and
 * guarantees a consistent stroke weight (1.5) and 24px grid across the site —
 * which is a large part of why an interface reads as "designed".
 *
 * RTL note: `arrow-forward` / `arrow-back` are *semantic*. In this RTL layout
 * "forward" points left, so use those rather than `arrow-left` / `-right`.
 */

export type IconName =
  // navigation & chrome
  | "menu" | "close" | "chevron-down" | "chevron-up" | "chevron-start" | "chevron-end"
  | "arrow-forward" | "arrow-back" | "arrow-up-left" | "external"
  // actions
  | "search" | "filter" | "copy" | "check" | "check-circle" | "plus" | "edit"
  | "trash" | "eye" | "download" | "upload" | "refresh" | "logout" | "send"
  // contact
  | "phone" | "mail" | "map-pin" | "clock" | "calendar" | "user" | "users"
  | "whatsapp" | "linkedin" | "instagram" | "telegram" | "x" | "aparat"
  // status
  | "alert" | "info" | "shield" | "lock" | "spinner" | "inbox" | "mail-open"
  // domain / services
  | "scale-minimal" | "handshake" | "globe" | "bridge" | "document" | "briefcase"
  | "columns" | "compass" | "layers" | "gavel-free-balance" | "gavel"
  | "article" | "question" | "settings" | "dashboard" | "quote"
  // CMS chrome
  | "image" | "link" | "palette" | "history" | "tag" | "code" | "grip"
  | "star" | "star-filled" | "duplicate" | "move-up" | "move-down" | "folder"
  | "youtube" | "facebook" | "list" | "eye-off" | "play";

const PATHS: Record<IconName, React.ReactNode> = {
  /* -- chrome ---------------------------------------------------------- */
  menu: <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h12" /></>,
  close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-up": <path d="m18 15-6-6-6 6" />,
  "chevron-start": <path d="m15 18-6-6 6-6" />,
  "chevron-end": <path d="m9 18 6-6-6-6" />,
  "arrow-forward": <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  "arrow-back": <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  "arrow-up-left": <><path d="M17 17 7 7" /><path d="M7 17V7h10" /></>,
  external: <><path d="M13 5h6v6" /><path d="M19 5 10 14" /><path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" /></>,

  /* -- actions --------------------------------------------------------- */
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  filter: <><path d="M3 5h18" /><path d="M6 12h12" /><path d="M10 19h4" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  edit: <><path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z" /><path d="m15 6 3 3" /></>,
  trash: <><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  eye: <><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  download: <><path d="M12 4v10" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></>,
  upload: <><path d="M12 16V6" /><path d="m8 9 4-4 4 4" /><path d="M5 19h14" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>,
  logout: <><path d="M14 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" /><path d="M20 12H10" /><path d="m13 9-3 3 3 3" /></>,
  send: <><path d="M21 3 3 10l7 3 3 7 8-17Z" /><path d="m10 13 4-4" /></>,

  /* -- contact --------------------------------------------------------- */
  phone: <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  "mail-open": <><path d="M3 10.5 12 4l9 6.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8.5Z" /><path d="m3 10.5 9 6 9-6" /></>,
  "map-pin": <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6" /><path d="M18 20a6.6 6.6 0 0 0-2-4.7" /></>,
  whatsapp: <><path d="M3.5 20.5 5 16.4A8 8 0 1 1 8.2 19.4l-4.7 1.1Z" /><path d="M9 9.5c.4 2 1.6 3.4 3.6 4.2l1-1.2 2 .9v1.4c0 .5-.5.9-1 .8-3.3-.4-5.9-3-6.3-6.3-.1-.5.3-1 .8-1h1.4l.5 1.2Z" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7" /><path d="M7 7v.01" /><path d="M11 17v-4a2 2 0 0 1 4 0v4" /><path d="M11 10v7" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17 7v.01" /></>,
  telegram: <><path d="M21 4 3 11l5 2 2 6 3-4 5 4 3-15Z" /><path d="m8 13 9-6-6 8" /></>,
  x: <><path d="m4 4 16 16" /><path d="M20 4 4 20" /></>,
  aparat: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /></>,

  /* -- status ---------------------------------------------------------- */
  alert: <><path d="M12 8v5" /><path d="M12 17v.01" /><circle cx="12" cy="12" r="9" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5v.01" /></>,
  shield: <><path d="M12 3 5 6v6c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="11" rx="2" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></>,
  spinner: <><path d="M12 3v3" opacity=".9" /><path d="M12 18v3" opacity=".3" /><path d="M3 12h3" opacity=".5" /><path d="M18 12h3" opacity=".7" /><path d="m5.6 5.6 2.1 2.1" opacity=".6" /><path d="m16.3 16.3 2.1 2.1" opacity=".35" /><path d="m18.4 5.6-2.1 2.1" opacity=".8" /><path d="m7.7 16.3-2.1 2.1" opacity=".4" /></>,
  inbox: <><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M4.5 6h15l1.5 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l1.5-7Z" /></>,

  /* -- domain ---------------------------------------------------------- */
  "scale-minimal": <><path d="M12 4v16" /><path d="M6 20h12" /><path d="M4 8h16" /><path d="M7 8 4.5 14h5L7 8Z" /><path d="M17 8l-2.5 6h5L17 8Z" /></>,
  handshake: <><path d="m3 12 3-3 4 3 2-1.5L16 13l3-3" /><path d="M3 12v3l4 4 2-2 2 2 2-2 2 2 4-4v-3" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18" /><path d="M12 3a15 15 0 0 0 0 18" /></>,
  bridge: <><path d="M3 17h18" /><path d="M3 17v-4a9 9 0 0 1 18 0v4" /><path d="M8 17v-3.6" /><path d="M16 17v-3.6" /><path d="M12 17V9" /></>,
  document: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>,
  columns: <><path d="M4 20h16" /><path d="M6 20V8" /><path d="M10 20V8" /><path d="M14 20V8" /><path d="M18 20V8" /><path d="m3 8 9-4 9 4" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 17 9 5 9-5" opacity=".55" /></>,
  "gavel-free-balance": <><path d="M12 3v18" /><path d="M5 21h14" /><circle cx="12" cy="7" r="1.5" /><path d="M4 11h16" /></>,
  gavel: <><path d="M4 20h9" /><path d="M8.5 15.5 15 9" /><path d="m13 4 7 7-2.5 2.5-7-7L13 4Z" /></>,
  article: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h6" /><path d="M7 13h10" /><path d="M7 17h7" /></>,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.7-.8 1.2v.4" /><path d="M12 16.5v.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2" /><path d="M12 18.8V21" /><path d="M3 12h2.2" /><path d="M18.8 12H21" /><path d="m5.6 5.6 1.6 1.6" /><path d="m16.8 16.8 1.6 1.6" /><path d="m18.4 5.6-1.6 1.6" /><path d="m7.2 16.8-1.6 1.6" /></>,
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>,
  quote: <><path d="M9 7c-2.5 1-4 3.2-4 6v4h5v-5H7c0-1.8.8-3.2 2-4V7Z" /><path d="M19 7c-2.5 1-4 3.2-4 6v4h5v-5h-3c0-1.8.8-3.2 2-4V7Z" /></>,

  /* -- CMS chrome ------------------------------------------------------ */
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /></>,
  link: <><path d="M10 13a4 4 0 0 0 5.7.4l2.6-2.6a4 4 0 0 0-5.7-5.7L11 6.7" /><path d="M14 11a4 4 0 0 0-5.7-.4l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.6-1.6" /></>,
  palette: <><path d="M12 21a9 9 0 1 1 9-9c0 2-1.6 3-3 3h-2a2 2 0 0 0-1.4 3.4A2 2 0 0 1 12 21Z" /><circle cx="7.5" cy="12" r="1" /><circle cx="9.5" cy="8" r="1" /><circle cx="14" cy="7.5" r="1" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3 4v5h5" /><path d="M12 8v4.3l3 1.8" /></>,
  tag: <><path d="M3 12.5V5a2 2 0 0 1 2-2h7.5L21 11.5 12.5 20 3 12.5Z" /><circle cx="7.5" cy="7.5" r="1.3" /></>,
  code: <><path d="m9 8-4 4 4 4" /><path d="m15 8 4 4-4 4" /></>,
  /* Six dots: the standard "drag me" affordance on a section row. */
  grip: <><circle cx="9" cy="6" r="1.2" /><circle cx="15" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" /><circle cx="15" cy="18" r="1.2" /></>,
  star: <path d="m12 4 2.4 5.1 5.6.7-4.1 3.9 1.1 5.5L12 16.5 6.9 19.2 8 13.7 3.9 9.8l5.6-.7L12 4Z" />,
  "star-filled": <path d="m12 4 2.4 5.1 5.6.7-4.1 3.9 1.1 5.5L12 16.5 6.9 19.2 8 13.7 3.9 9.8l5.6-.7L12 4Z" fill="currentColor" />,
  duplicate: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 5.5A1.5 1.5 0 0 0 14.5 4H6a2 2 0 0 0-2 2v8.5A1.5 1.5 0 0 0 5.5 16" /></>,
  "move-up": <><path d="M12 19V6" /><path d="m6 11 6-6 6 6" /></>,
  "move-down": <><path d="M12 5v13" /><path d="m6 13 6 6 6-6" /></>,
  folder: <><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-10Z" /></>,
  youtube: <><rect x="2.5" y="6" width="19" height="12" rx="3.5" /><path d="m10.5 9.5 5 2.5-5 2.5v-5Z" /></>,
  facebook: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M15 8h-1.5A1.5 1.5 0 0 0 12 9.5V12m-1.5 0h4" /><path d="M12 12v8" /></>,
  list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3.5 6h.01" /><path d="M3.5 12h.01" /><path d="M3.5 18h.01" /></>,
  "eye-off": <><path d="m4 4 16 16" /><path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.3 4.1" /><path d="M6.3 7.9A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.85" /><path d="M9.9 10a2.5 2.5 0 0 0 3.4 3.5" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8.5 5.5 3.5L10 15.5v-7Z" /></>,
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number | string;
  /** Stroke width; 1.5 is the house weight. */
  weight?: number;
}

export function Icon({
  name,
  size = 20,
  weight = 1.5,
  className,
  ...props
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Continuously rotating spinner used by pending states. */
export function Spinner({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("shrink-0 animate-spin", className)}
      style={{ animationDuration: "0.9s" }}
    >
      <circle cx="12" cy="12" r="9" opacity="0.22" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}
