import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Open Graph image generation.
 *
 * ── Why the text is pre-reversed ──────────────────────────────────────────
 * Satori (the renderer behind `ImageResponse`) shapes Arabic glyphs correctly
 * but lays runs out left-to-right, and neither `direction: rtl`, a RLM mark,
 * nor `text-align` changes that — all three were measured against this font
 * and produce the same wrong order. It also treats a ZWNJ as a run boundary,
 * so "تصمیم‌های" comes out as "های‌تصمیم".
 *
 * `toVisualOrder()` compensates by reversing word order, and the ZWNJ segments
 * inside each word, before handing satori a single text node. Rendered
 * left-to-right, that reads correctly right-to-left — with the natural word
 * spacing a single text node gives (splitting words into flex children adds a
 * visible gap at every boundary, including inside ZWNJ compounds).
 *
 * Line breaking is done here too: satori's `flex-wrap` redistributes leftover
 * space across a line, which produces ragged gaps.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const ZWNJ = "‌";
const FONT_DIR = join(process.cwd(), "public", "fonts", "og");

/** Text column width: 1200 minus the padding on either side. */
const TEXT_WIDTH = 1200 - 78 - 400;

let fontCache: { bold: Buffer; regular: Buffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const [bold, regular] = await Promise.all([
    readFile(join(FONT_DIR, "Vazirmatn-Bold.ttf")),
    readFile(join(FONT_DIR, "Vazirmatn-Regular.ttf")),
  ]);
  fontCache = { bold, regular };
  return fontCache;
}

/** Logical Persian order → the visual order satori needs. */
function toVisualOrder(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map((word) => word.split(ZWNJ).reverse().join(ZWNJ))
    .join(" ");
}

/**
 * Greedy line breaker. Persian glyphs average roughly 0.52em, so the
 * character budget is derived from the column width and font size.
 */
function wrapLines(text: string, fontSize: number, width = TEXT_WIDTH): string[] {
  const maxChars = Math.max(8, Math.floor(width / (fontSize * 0.52)));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (`${current} ${word}`.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines;
}

/** A right-to-left paragraph, broken and ordered for satori. */
function RtlBlock({
  text,
  fontSize,
  lineHeight,
  color,
  marginTop = 0,
  maxLines,
}: {
  text: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  marginTop?: number;
  maxLines?: number;
}) {
  let lines = wrapLines(text, fontSize);
  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        marginTop,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            fontSize,
            color,
            height: Math.round(fontSize * lineHeight),
            whiteSpace: "nowrap",
          }}
        >
          {toVisualOrder(line)}
        </div>
      ))}
    </div>
  );
}

export interface OgImageInput {
  /** Small label above the title, e.g. the section or category. */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Framed badge under the text, e.g. a date or reading time. */
  meta?: string;
  institution: string;
}

/** Renders the shared OG card. */
export async function renderOgImage({
  kicker,
  title,
  subtitle,
  meta,
  institution,
}: OgImageInput) {
  const fonts = await loadFonts();
  const titleSize = title.length > 52 ? 50 : 60;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background:
            "linear-gradient(215deg, #13223d 0%, #0b1526 58%, #070f1f 100%)",
          fontFamily: "Vazirmatn",
          overflow: "hidden",
        }}
      >
        {/* measure grid */}
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 150 * (i + 1),
                width: 1,
                background: "rgba(255,255,255,0.045)",
              }}
            />
          ))}
        </div>

        {/* keystone arch — on the left, clear of the right-aligned text */}
        <div
          style={{
            position: "absolute",
            top: 168,
            left: 66,
            width: 300,
            height: 330,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              borderTop: "1.5px solid rgba(255,255,255,0.28)",
              borderLeft: "1.5px solid rgba(255,255,255,0.28)",
              borderRight: "1.5px solid rgba(255,255,255,0.28)",
              borderTopLeftRadius: 150,
              borderTopRightRadius: 150,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 46,
              left: 46,
              right: 46,
              bottom: 0,
              display: "flex",
              borderTop: "1.2px solid rgba(255,255,255,0.14)",
              borderLeft: "1.2px solid rgba(255,255,255,0.14)",
              borderRight: "1.2px solid rgba(255,255,255,0.14)",
              borderTopLeftRadius: 104,
              borderTopRightRadius: 104,
            }}
          />
          {/* keystone, seated on the apex */}
          <div
            style={{
              position: "absolute",
              top: -16,
              left: 128,
              width: 44,
              height: 38,
              display: "flex",
              background: "#c8a96a",
            }}
          />
          {/* plinth */}
          <div
            style={{
              position: "absolute",
              left: -52,
              right: -52,
              bottom: 0,
              height: 2,
              display: "flex",
              background: "rgba(255,255,255,0.3)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -52,
              width: 140,
              bottom: 0,
              height: 2,
              display: "flex",
              background: "#c8a96a",
            }}
          />
        </div>

        {/* content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            width: "100%",
            padding: "70px 78px 70px 400px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "rgba(255,255,255,0.55)",
                whiteSpace: "nowrap",
              }}
            >
              {toVisualOrder(institution)}
            </div>
            <div
              style={{ display: "flex", width: 34, height: 2, background: "#c8a96a" }}
            />
          </div>

          {kicker && (
            <RtlBlock
              text={kicker}
              fontSize={24}
              lineHeight={1.6}
              color="#c8a96a"
              marginTop={24}
              maxLines={1}
            />
          )}

          <RtlBlock
            text={title}
            fontSize={titleSize}
            lineHeight={1.44}
            color="#ffffff"
            marginTop={kicker ? 14 : 26}
            maxLines={3}
          />

          {subtitle && (
            <RtlBlock
              text={subtitle}
              fontSize={25}
              lineHeight={1.75}
              color="rgba(255,255,255,0.6)"
              marginTop={24}
              maxLines={2}
            />
          )}

          {meta && (
            <div
              style={{
                display: "flex",
                marginTop: 30,
                fontSize: 21,
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.16)",
                padding: "9px 20px",
                whiteSpace: "nowrap",
              }}
            >
              {toVisualOrder(meta)}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Vazirmatn", data: fonts.bold, weight: 700, style: "normal" },
        { name: "Vazirmatn", data: fonts.regular, weight: 400, style: "normal" },
      ],
    },
  );
}
