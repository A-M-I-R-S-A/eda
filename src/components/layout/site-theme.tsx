import type { BrandingSettings, CustomCodeSettings } from "@/types";
import { DEFAULT_BRANDING } from "@/data/defaults";

/**
 * Runtime theming and administrator-supplied code.
 *
 * ── Branding ──────────────────────────────────────────────────────────────
 * The palette is emitted as CSS custom properties that override the
 * compile-time Tailwind tokens. Only values that *differ* from the shipped
 * defaults are emitted, so an untouched installation ships zero override CSS
 * and the designed palette stays authoritative.
 *
 * ── Custom code ───────────────────────────────────────────────────────────
 * Scripts pasted into the advanced settings are extracted and rendered as real
 * `<script>` elements. Injecting them as raw HTML would look right and do
 * nothing: markup inserted via `innerHTML` never executes, which is a
 * particularly unhelpful way for an analytics tag to fail.
 */

/* -------------------------------------------------------------------------- */
/*  Branding                                                                  */
/* -------------------------------------------------------------------------- */

/** Rough perceptual lightness, used to derive readable companion tokens. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  if (value.length !== 6) return 0.5;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mixes a colour towards white or black by `amount` (0–1). */
function shade(hex: string, amount: number, towards: "white" | "black"): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const target = towards === "white" ? 255 : 0;

  const channel = (start: number) =>
    Math.round(start + (target - start) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(parseInt(value.slice(0, 2), 16))}${channel(
    parseInt(value.slice(2, 4), 16),
  )}${channel(parseInt(value.slice(4, 6), 16))}`;
}

export function brandingCss(branding: BrandingSettings): string {
  const declarations: string[] = [];
  const push = (property: string, value: string) =>
    declarations.push(`${property}:${value}`);

  const defaults = DEFAULT_BRANDING;

  if (branding.primaryColor !== defaults.primaryColor) {
    const primary = branding.primaryColor;
    // The navy ramp is what buttons, headings and the footer are built from;
    // deriving the neighbouring steps keeps hover and active states coherent
    // instead of leaving them pointing at the old palette.
    push("--color-navy-950", shade(primary, 0.25, "black"));
    push("--color-navy-900", primary);
    push("--color-navy-800", shade(primary, 0.1, "white"));
    push("--color-navy-700", shade(primary, 0.2, "white"));
  }

  if (branding.secondaryColor !== defaults.secondaryColor) {
    push("--color-navy-600", branding.secondaryColor);
    push("--color-navy-500", shade(branding.secondaryColor, 0.15, "white"));
  }

  if (branding.accentColor !== defaults.accentColor) {
    const accent = branding.accentColor;
    push("--color-gold-400", accent);
    push("--color-gold-500", shade(accent, 0.12, "black"));
    push("--color-gold-600", shade(accent, 0.25, "black"));
    push("--color-gold-300", shade(accent, 0.18, "white"));
    push("--color-gold-200", shade(accent, 0.35, "white"));
  }

  if (branding.backgroundColor !== defaults.backgroundColor) {
    push("--color-paper", branding.backgroundColor);
    push(
      "--color-paper-2",
      shade(
        branding.backgroundColor,
        luminance(branding.backgroundColor) > 0.5 ? 0.04 : 0.08,
        luminance(branding.backgroundColor) > 0.5 ? "black" : "white",
      ),
    );
  }

  if (branding.surfaceColor !== defaults.surfaceColor) {
    push("--color-surface", branding.surfaceColor);
  }
  if (branding.textColor !== defaults.textColor) {
    push("--color-ink", branding.textColor);
    push("--color-ink-2", shade(branding.textColor, 0.2, "white"));
  }
  if (branding.mutedColor !== defaults.mutedColor) {
    push("--color-muted", branding.mutedColor);
    push("--color-muted-2", shade(branding.mutedColor, 0.15, "white"));
  }
  if (branding.borderColor !== defaults.borderColor) {
    push("--color-line", branding.borderColor);
    push("--color-line-2", shade(branding.borderColor, 0.12, "black"));
  }

  if (branding.fontFamily) {
    // The bundled Vazirmatn stays as the fallback so Persian never loses its
    // typeface if the administrator's stack fails to load.
    push("--font-sans", `${branding.fontFamily}, var(--font-vazirmatn), sans-serif`);
  }
  if (branding.cornerRadius !== defaults.cornerRadius) {
    const radius = branding.cornerRadius;
    push("--radius-xs", `${Math.max(0, radius - 1)}px`);
    push("--radius-sm", `${radius}px`);
    push("--radius-md", `${radius + 1}px`);
    push("--radius-lg", `${radius + 3}px`);
  }

  const rootRules = declarations.length ? `:root{${declarations.join(";")}}` : "";

  const bodyRules: string[] = [];
  if (branding.baseFontSize !== defaults.baseFontSize) {
    bodyRules.push(`font-size:${branding.baseFontSize}px`);
  }
  if (branding.lineHeight !== defaults.lineHeight) {
    bodyRules.push(`line-height:${branding.lineHeight}`);
  }
  const bodyRule = bodyRules.length ? `body{${bodyRules.join(";")}}` : "";

  const headingRule =
    branding.headingScale !== defaults.headingScale
      ? `h1,h2,h3,.display-1,.display-2,.display-3{font-size:calc(1em * ${branding.headingScale})}`
      : "";

  return `${rootRules}${bodyRule}${headingRule}`;
}

export function BrandingStyles({ branding }: { branding: BrandingSettings }) {
  const css = brandingCss(branding);
  if (!css) return null;
  return <style id="cms-branding" dangerouslySetInnerHTML={{ __html: css }} />;
}

/* -------------------------------------------------------------------------- */
/*  Custom code                                                               */
/* -------------------------------------------------------------------------- */

export interface ParsedScript {
  src?: string;
  content?: string;
  async: boolean;
  defer: boolean;
}

/**
 * Pulls `<script>` tags out of pasted markup.
 *
 * Analytics snippets are almost always copied as a full tag, so accepting only
 * bare JavaScript would reject the exact thing people paste. Anything outside
 * a script tag is discarded rather than injected as HTML.
 */
export function parseScriptTags(markup: string): ParsedScript[] {
  if (!markup?.trim()) return [];

  const scripts: ParsedScript[] = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) {
    const attributes = match[1] ?? "";
    const content = (match[2] ?? "").trim();
    const src = /\ssrc\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1];

    scripts.push({
      src,
      content: src ? undefined : content || undefined,
      async: /\basync\b/i.test(attributes),
      defer: /\bdefer\b/i.test(attributes),
    });
  }

  // No tags at all means the administrator pasted bare JavaScript, which is
  // just as valid an input.
  if (scripts.length === 0 && markup.trim()) {
    scripts.push({ content: markup.trim(), async: false, defer: false });
  }

  return scripts;
}

function ScriptList({ markup }: { markup: string }) {
  const scripts = parseScriptTags(markup);
  if (!scripts.length) return null;

  return (
    <>
      {scripts.map((script, index) =>
        script.src ? (
          <script
            key={`s-${index}`}
            src={script.src}
            async={script.async}
            defer={script.defer}
          />
        ) : script.content ? (
          <script
            key={`i-${index}`}
            dangerouslySetInnerHTML={{ __html: script.content }}
          />
        ) : null,
      )}
    </>
  );
}

/**
 * Everything the advanced settings screen can inject, rendered once.
 *
 * `position` decides which half runs: `head` for analytics that must load
 * early, `body` for anything that should not block first paint.
 */
export function CustomCode({
  code,
  position,
}: {
  code: CustomCodeSettings;
  position: "head" | "body";
}) {
  if (position === "head") {
    return (
      <>
        {code.customCss && (
          <style
            id="cms-custom-css"
            dangerouslySetInnerHTML={{ __html: code.customCss }}
          />
        )}

        {code.googleTagManagerId && (
          /**
           * Rendered inline rather than via `@next/third-parties`: the id is a
           * CMS value that may be absent, and pulling in another dependency to
           * emit six lines of vendor script is not a trade worth making.
           */
          // eslint-disable-next-line @next/next/next-script-for-ga
          <script
            id="gtm"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${code.googleTagManagerId}');`,
            }}
          />
        )}

        {code.googleAnalyticsId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${code.googleAnalyticsId}`}
            />
            <script
              id="ga"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${code.googleAnalyticsId}');`,
              }}
            />
          </>
        )}

        <ScriptList markup={code.headScripts} />
      </>
    );
  }

  return (
    <>
      <ScriptList markup={code.bodyScripts} />
      {code.customJs && (
        <script
          id="cms-custom-js"
          dangerouslySetInnerHTML={{ __html: code.customJs }}
        />
      )}
    </>
  );
}
