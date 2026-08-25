import type { ReactNode } from "react";
import Link from "next/link";
import { headingId } from "@/lib/utils/slug";

/**
 * A deliberately small Markdown subset used for article and service bodies.
 *
 * It is parsed into a typed block tree and rendered as React elements — never
 * with `dangerouslySetInnerHTML`. That removes an entire class of stored-XSS
 * risk from admin-authored content, which matters because the editor role can
 * publish to the public site.
 *
 * Supported: `## h2`, `### h3`, `- ` bullets, `1. ` numbers, `> ` quote,
 * `---` rule, `![alt](src)` images, blank-line paragraphs, and inline
 * `**bold**`, `*italic*`, `` `code` `` and `[label](href)`.
 */

export type Block =
  | { kind: "heading"; level: 2 | 3; text: string; id: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "rule" };

export function parseRichText(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let headingIndex = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list && list.items.length) {
      blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    if (line === "---" || line === "***") {
      flushAll();
      blocks.push({ kind: "rule" });
      continue;
    }

    /**
     * An image on its own line is a block, not inline content — that is how
     * the editor inserts one, and it lets the renderer size it properly
     * instead of dropping a raw `<img>` into a paragraph.
     */
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line);
    if (image) {
      flushAll();
      blocks.push({ kind: "image", src: image[2], alt: image[1].trim() });
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length === 2 ? 2 : 3;
      const text = heading[2].trim();
      headingIndex += 1;
      blocks.push({
        kind: "heading",
        level: level as 2 | 3,
        text,
        id: headingId(text, headingIndex),
      });
      continue;
    }

    if (line.startsWith("> ")) {
      flushAll();
      blocks.push({ kind: "quote", text: line.slice(2).trim() });
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1].trim());
      continue;
    }

    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[2].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}

/** Headings, for building an article table of contents. */
export function extractHeadings(source: string) {
  return parseRichText(source).filter(
    (b): b is Extract<Block, { kind: "heading" }> => b.kind === "heading",
  );
}

/** Plain text, for meta descriptions and reading-time estimates. */
export function toPlainText(source: string): string {
  return parseRichText(source)
    .map((b) => {
      if (b.kind === "list") return b.items.join(" ");
      if (b.kind === "rule") return "";
      if (b.kind === "image") return b.alt;
      return b.text;
    })
    .join(" ")
    .replace(/[*`_[\]]/g, "")
    .replace(/\(https?:\/\/[^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/*  Inline rendering                                                          */
/* -------------------------------------------------------------------------- */

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN).filter(Boolean);

  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.9em] text-navy-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      const isInternal = href.startsWith("/");
      if (isInternal) {
        return (
          <Link key={key} href={href}>
            {label}
          </Link>
        );
      }
      return (
        <a key={key} href={href} rel="nofollow noopener noreferrer" target="_blank">
          {label}
        </a>
      );
    }

    return <span key={key}>{part}</span>;
  });
}

/* -------------------------------------------------------------------------- */
/*  Block rendering                                                           */
/* -------------------------------------------------------------------------- */

export function RichText({
  source,
  className = "prose-fa",
}: {
  source: string;
  className?: string;
}) {
  const blocks = parseRichText(source);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const key = `b-${index}`;

        switch (block.kind) {
          case "heading":
            return block.level === 2 ? (
              <h2 key={key} id={block.id}>
                {renderInline(block.text, key)}
              </h2>
            ) : (
              <h3 key={key} id={block.id}>
                {renderInline(block.text, key)}
              </h3>
            );

          case "list":
            return block.ordered ? (
              <ol key={key}>
                {block.items.map((item, i) => (
                  <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key}>
                {block.items.map((item, i) => (
                  <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
                ))}
              </ul>
            );

          case "quote":
            return (
              <blockquote key={key}>{renderInline(block.text, key)}</blockquote>
            );

          case "image":
            return (
              <figure key={key} className="!my-10">
                {/* eslint-disable-next-line @next/next/no-img-element --
                    Body images come from the media library at unknown
                    dimensions; `next/image` needs either a size or `fill`,
                    and neither is knowable from Markdown. */}
                <img
                  src={block.src}
                  alt={block.alt}
                  loading="lazy"
                  decoding="async"
                  className="w-full rounded-sm border border-line"
                />
                {block.alt && (
                  <figcaption className="mt-2.5 text-[0.8125rem] text-muted">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );

          case "rule":
            return <hr key={key} className="hairline !my-12" />;

          default:
            return <p key={key}>{renderInline(block.text, key)}</p>;
        }
      })}
    </div>
  );
}
