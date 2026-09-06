import type { ReactNode } from "react";
import Link from "next/link";
import { headingId } from "@/lib/utils/slug";

/**
 * The Markdown renderer used for article, arbitrator and section bodies.
 *
 * Source is parsed into a typed block/inline tree and rendered as React
 * elements — never with `dangerouslySetInnerHTML`. That removes an entire
 * class of stored-XSS risk from admin-authored content, which matters because
 * the editor role can publish to the public site.
 *
 * Block level: ATX headings (`#`–`######`), paragraphs, bullet and numbered
 * lists (nested), blockquotes, fenced code, GFM pipe tables, thematic breaks
 * and stand-alone images.
 *
 * Inline level: `**bold**`, `__bold__`, `*italic*`, `_italic_`, `~~strike~~`,
 * `` `code` ``, `[label](href "title")`, `![alt](src)`, `<https://autolink>`,
 * backslash escapes and two-space hard line breaks.
 *
 * Anything the parser does not recognise stays literal text rather than being
 * dropped, so no content can disappear because of a syntax mistake.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type Align = "start" | "center" | "end";

export interface ListItem {
  /** Inline text of the item's first line. */
  text: string;
  /** Nested lists and continuation blocks, if any. */
  blocks: Block[];
}

export type Block =
  | { kind: "heading"; level: 2 | 3 | 4; text: string; id: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { kind: "quote"; blocks: Block[] }
  | { kind: "image"; src: string; alt: string }
  | { kind: "code"; lang: string; text: string }
  | { kind: "table"; header: string[]; align: Align[]; rows: string[][] }
  | { kind: "rule" };

/** Heading numbering runs across the whole document, for stable anchors. */
interface Ctx {
  headings: number;
}

/* -------------------------------------------------------------------------- */
/*  Block parsing                                                             */
/* -------------------------------------------------------------------------- */

const HEADING_RE = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const RULE_RE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*(\S*)[ \t]*$/;
const IMAGE_RE =
  /^!\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)(?:[ \t]+["'][^"']*["'])?\s*\)$/;
const MARKER_RE = /^( *)([-*+•]|\d{1,9}[.)])([ \t]+)(.*)$/;

/** Leading tabs become four spaces so indentation maths is uniform. */
function expandLeadingTabs(line: string): string {
  const match = /^[ \t]+/.exec(line);
  if (!match) return line;
  return match[0].replace(/\t/g, "    ") + line.slice(match[0].length);
}

function leadingSpaces(line: string): number {
  const match = /^ */.exec(line);
  return match ? match[0].length : 0;
}

interface Marker {
  indent: number;
  ordered: boolean;
  number: number;
  contentIndent: number;
  text: string;
}

function matchMarker(line: string): Marker | null {
  const m = MARKER_RE.exec(line);
  if (!m) return null;
  const ordered = /\d/.test(m[2]);
  return {
    indent: m[1].length,
    ordered,
    number: ordered ? parseInt(m[2], 10) : 1,
    contentIndent: m[1].length + m[2].length + m[3].length,
    text: m[4],
  };
}

/* -- tables ---------------------------------------------------------------- */

function splitRow(row: string): string[] {
  const inner = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cell = "";

  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] === "\\" && inner[i + 1] === "|") {
      cell += "|";
      i += 1;
      continue;
    }
    if (inner[i] === "|") {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += inner[i];
  }

  cells.push(cell.trim());
  return cells;
}

function isDelimiterRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  const cells = splitRow(trimmed);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function alignOf(cell: string): Align {
  const start = cell.startsWith(":");
  const end = cell.endsWith(":");
  if (start && end) return "center";
  if (end) return "end";
  return "start";
}

/* -- lists ----------------------------------------------------------------- */

function parseList(
  lines: string[],
  start: number,
  ctx: Ctx,
): { block: Block; next: number } {
  const first = matchMarker(lines[start]) as Marker;
  const ordered = first.ordered;
  const baseIndent = first.indent;

  const items: ListItem[] = [];
  let current: { text: string; raw: string[] } | null = null;
  let contentIndent = first.contentIndent;
  let i = start;

  const commit = () => {
    if (!current) return;
    const raw = current.raw;
    while (raw.length && !raw[raw.length - 1].trim()) raw.pop();
    items.push({
      text: current.text,
      blocks: raw.length ? parseBlocks(raw, ctx) : [],
    });
    current = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      // A blank line only continues the list if what follows still belongs to it.
      const next = lines[i + 1];
      const nextMarker = next ? matchMarker(next) : null;
      const continues =
        !!next &&
        !!next.trim() &&
        ((nextMarker !== null && nextMarker.indent >= baseIndent) ||
          leadingSpaces(next) >= contentIndent);
      if (!continues) break;
      if (current) current.raw.push("");
      i += 1;
      continue;
    }

    const marker = matchMarker(line);

    // A new item at (roughly) this level.
    if (marker && marker.indent <= baseIndent + 1) {
      // Switching between bullets and numbers starts a separate list.
      if (marker.ordered !== ordered) break;
      commit();
      current = { text: marker.text.trim(), raw: [] };
      contentIndent = marker.contentIndent;
      i += 1;
      continue;
    }

    // Indented content belongs to the current item (nested list, extra paragraph).
    const indent = leadingSpaces(line);
    if (current && indent > baseIndent) {
      current.raw.push(line.slice(Math.min(indent, contentIndent)));
      i += 1;
      continue;
    }

    break;
  }

  commit();

  return {
    block: { kind: "list", ordered, start: ordered ? first.number : 1, items },
    next: i,
  };
}

/* -- the block loop -------------------------------------------------------- */

function parseBlocks(rawLines: string[], ctx: Ctx): Block[] {
  const lines = rawLines.map(expandLeadingTabs);
  const blocks: Block[] = [];

  let paragraph: { text: string; hard: boolean }[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    let text = "";
    paragraph.forEach((entry, index) => {
      if (index > 0) text += paragraph[index - 1].hard ? "\n" : " ";
      text += entry.text;
    });
    blocks.push({ kind: "paragraph", text: text.trim() });
    paragraph = [];
  };

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      i += 1;
      continue;
    }

    /* -- fenced code ------------------------------------------------------ */
    const fence = FENCE_RE.exec(line);
    if (fence) {
      flushParagraph();
      const char = fence[1][0];
      const width = fence[1].length;
      const body: string[] = [];
      i += 1;

      while (i < lines.length) {
        const candidate = lines[i].trim();
        const closes =
          candidate.length >= width &&
          candidate.split("").every((c) => c === char);
        if (closes) {
          i += 1;
          break;
        }
        body.push(lines[i]);
        i += 1;
      }

      blocks.push({ kind: "code", lang: fence[2] ?? "", text: body.join("\n") });
      continue;
    }

    /* -- thematic break --------------------------------------------------- */
    if (RULE_RE.test(line)) {
      flushParagraph();
      blocks.push({ kind: "rule" });
      i += 1;
      continue;
    }

    /* -- pipe table ------------------------------------------------------- */
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isDelimiterRow(lines[i + 1])
    ) {
      const header = splitRow(trimmed);
      const align = splitRow(lines[i + 1].trim()).map(alignOf);

      if (header.length > 0 && header.length === align.length) {
        flushParagraph();
        i += 2;

        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
          const cells = splitRow(lines[i].trim());
          while (cells.length < header.length) cells.push("");
          rows.push(cells.slice(0, header.length));
          i += 1;
        }

        blocks.push({ kind: "table", header, align, rows });
        continue;
      }
    }

    /**
     * An image on its own line is a block, not inline content — that is how
     * the editor inserts one, and it lets the renderer size it properly
     * instead of dropping a raw `<img>` into a paragraph.
     */
    const image = IMAGE_RE.exec(trimmed);
    if (image) {
      flushParagraph();
      blocks.push({
        kind: "image",
        src: image[2].replace(/^<|>$/g, ""),
        alt: image[1].trim(),
      });
      i += 1;
      continue;
    }

    /* -- heading ---------------------------------------------------------- */
    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      const depth = heading[1].length;
      // `#` is remapped to `h2`: the page template already owns the only `h1`.
      const level: 2 | 3 | 4 = depth <= 2 ? 2 : depth === 3 ? 3 : 4;
      const text = heading[2].trim();
      ctx.headings += 1;
      blocks.push({
        kind: "heading",
        level,
        text,
        id: headingId(text, ctx.headings),
      });
      i += 1;
      continue;
    }

    /* -- blockquote ------------------------------------------------------- */
    if (/^ {0,3}>/.test(line)) {
      flushParagraph();
      const inner: string[] = [];
      while (i < lines.length && /^ {0,3}>/.test(lines[i])) {
        inner.push(lines[i].replace(/^ {0,3}>[ \t]?/, ""));
        i += 1;
      }
      blocks.push({ kind: "quote", blocks: parseBlocks(inner, ctx) });
      continue;
    }

    /* -- list ------------------------------------------------------------- */
    if (matchMarker(line)) {
      flushParagraph();
      const list = parseList(lines, i, ctx);
      blocks.push(list.block);
      i = list.next;
      continue;
    }

    /* -- paragraph line --------------------------------------------------- */
    const withoutTrailing = line.replace(/[ \t]+$/, "");
    const backslashBreak = withoutTrailing.endsWith("\\");
    paragraph.push({
      text: (backslashBreak
        ? withoutTrailing.slice(0, -1)
        : withoutTrailing
      ).trim(),
      hard: / {2,}$/.test(line) || backslashBreak,
    });
    i += 1;
  }

  flushParagraph();
  return blocks;
}

export function parseRichText(source: string): Block[] {
  return parseBlocks(source.replace(/\r\n?/g, "\n").split("\n"), { headings: 0 });
}

/* -------------------------------------------------------------------------- */
/*  Inline parsing                                                            */
/* -------------------------------------------------------------------------- */

type Inline =
  | { t: "text"; v: string }
  | { t: "br" }
  | { t: "code"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "del"; c: Inline[] }
  | { t: "link"; href: string; title?: string; c: Inline[] }
  | { t: "image"; src: string; alt: string };

const ESCAPABLE = /[\\`*_{}[\]()#+\-.!>~|]/;
const WORD = /[\p{L}\p{N}]/u;

interface LinkMatch {
  label: string;
  href: string;
  title?: string;
  end: number;
}

/** Matches `[label](href "title")` starting at the `[`, honouring nesting. */
function matchLink(text: string, start: number): LinkMatch | null {
  let depth = 0;
  let i = start;

  for (; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\\") {
      i += 1;
      continue;
    }
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  if (i >= text.length) return null;

  const label = text.slice(start + 1, i);
  let j = i + 1;
  if (text[j] !== "(") return null;
  j += 1;

  let href = "";
  if (text[j] === "<") {
    const close = text.indexOf(">", j);
    if (close === -1) return null;
    href = text.slice(j + 1, close);
    j = close + 1;
  } else {
    let parens = 0;
    while (j < text.length) {
      const char = text[j];
      if (char === "\\") {
        href += text[j + 1] ?? "";
        j += 2;
        continue;
      }
      if (/\s/.test(char)) break;
      if (char === "(") parens += 1;
      if (char === ")") {
        if (parens === 0) break;
        parens -= 1;
      }
      href += char;
      j += 1;
    }
  }

  while (j < text.length && /\s/.test(text[j])) j += 1;

  let title: string | undefined;
  if (text[j] === '"' || text[j] === "'") {
    const quote = text[j];
    const close = text.indexOf(quote, j + 1);
    if (close === -1) return null;
    title = text.slice(j + 1, close);
    j = close + 1;
    while (j < text.length && /\s/.test(text[j])) j += 1;
  }

  if (text[j] !== ")") return null;
  return { label, href, title, end: j + 1 };
}

/**
 * Matches an emphasis run at `start`.
 *
 * `_` is deliberately restricted to word boundaries so identifiers such as
 * `snake_case_name` — common in file names and document references — are
 * never silently turned into italics.
 */
function matchEmphasis(
  text: string,
  start: number,
  char: string,
): { node: Inline; end: number } | null {
  let run = 0;
  while (text[start + run] === char) run += 1;

  const width = run >= 2 ? 2 : 1;
  const marker = char.repeat(width);
  const contentStart = start + width;

  if (!text[contentStart] || /\s/.test(text[contentStart])) return null;
  if (char === "_" && WORD.test(text[start - 1] ?? "")) return null;

  let j = contentStart;
  while (j < text.length) {
    if (text[j] === "\\") {
      j += 2;
      continue;
    }
    if (text.startsWith(marker, j) && !/\s/.test(text[j - 1])) {
      if (char === "_" && WORD.test(text[j + width] ?? "")) {
        j += 1;
        continue;
      }
      const content = text.slice(contentStart, j);
      if (!content) return null;
      return {
        node: { t: width === 2 ? "strong" : "em", c: parseInline(content) },
        end: j + width,
      };
    }
    j += 1;
  }

  return null;
}

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      out.push({ t: "text", v: buffer });
      buffer = "";
    }
  };

  while (i < text.length) {
    const char = text[i];

    if (char === "\\" && ESCAPABLE.test(text[i + 1] ?? "")) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (char === "\n") {
      flush();
      out.push({ t: "br" });
      i += 1;
      continue;
    }

    if (char === "`") {
      let run = 0;
      while (text[i + run] === "`") run += 1;
      const fence = "`".repeat(run);
      const close = text.indexOf(fence, i + run);
      if (close !== -1) {
        flush();
        out.push({ t: "code", v: text.slice(i + run, close).trim() });
        i = close + run;
        continue;
      }
    }

    if (char === "<") {
      const auto = /^<((?:https?|mailto|tel):[^\s<>]+)>/.exec(text.slice(i));
      if (auto) {
        flush();
        out.push({
          t: "link",
          href: auto[1],
          c: [{ t: "text", v: auto[1].replace(/^(?:mailto|tel):/, "") }],
        });
        i += auto[0].length;
        continue;
      }
      const mail = /^<([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/.exec(text.slice(i));
      if (mail) {
        flush();
        out.push({
          t: "link",
          href: `mailto:${mail[1]}`,
          c: [{ t: "text", v: mail[1] }],
        });
        i += mail[0].length;
        continue;
      }
    }

    if (char === "!" && text[i + 1] === "[") {
      const link = matchLink(text, i + 1);
      if (link) {
        flush();
        out.push({
          t: "image",
          src: link.href,
          alt: link.label.replace(/[*_`~\\]/g, ""),
        });
        i = link.end;
        continue;
      }
    }

    if (char === "[") {
      const link = matchLink(text, i);
      if (link) {
        flush();
        out.push({
          t: "link",
          href: link.href,
          title: link.title,
          c: parseInline(link.label),
        });
        i = link.end;
        continue;
      }
    }

    if (char === "~" && text[i + 1] === "~") {
      const close = text.indexOf("~~", i + 2);
      if (close > i + 2) {
        flush();
        out.push({ t: "del", c: parseInline(text.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    if (char === "*" || char === "_") {
      const emphasis = matchEmphasis(text, i, char);
      if (emphasis) {
        flush();
        out.push(emphasis.node);
        i = emphasis.end;
        continue;
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Plain text + headings                                                     */
/* -------------------------------------------------------------------------- */

function inlineToText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      switch (node.t) {
        case "text":
        case "code":
          return node.v;
        case "image":
          return node.alt;
        case "br":
          return " ";
        default:
          return inlineToText(node.c);
      }
    })
    .join("");
}

function blocksToText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "heading":
        case "paragraph":
          return inlineToText(parseInline(block.text));
        case "list":
          return block.items
            .map(
              (item) =>
                `${inlineToText(parseInline(item.text))} ${blocksToText(item.blocks)}`,
            )
            .join(" ");
        case "quote":
          return blocksToText(block.blocks);
        case "image":
          return block.alt;
        case "code":
          return block.text;
        case "table":
          return [block.header, ...block.rows]
            .map((row) => row.join(" "))
            .join(" ");
        default:
          return "";
      }
    })
    .join(" ");
}

/** Headings, for building an article table of contents. */
export function extractHeadings(source: string) {
  const found: Extract<Block, { kind: "heading" }>[] = [];

  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.kind === "heading") found.push(block);
      else if (block.kind === "quote") walk(block.blocks);
      else if (block.kind === "list") {
        block.items.forEach((item) => walk(item.blocks));
      }
    }
  };

  walk(parseRichText(source));
  return found;
}

/** Plain text, for meta descriptions and reading-time estimates. */
export function toPlainText(source: string): string {
  return blocksToText(parseRichText(source)).replace(/\s+/g, " ").trim();
}

/* -------------------------------------------------------------------------- */
/*  Inline rendering                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Only navigable schemes survive. Admin-authored Markdown is trusted content,
 * but an editor account is not a place to leave `javascript:` reachable.
 */
function safeHref(href: string): string | null {
  const value = href.trim();
  if (!value) return null;
  if (/^(?:\/|#|\.\/|\.\.\/)/.test(value)) return value;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return value;
  return null;
}

function safeSrc(src: string): string | null {
  const value = src.trim();
  if (!value) return null;
  return /^(?:\/|https?:)/i.test(value) ? value : null;
}

function renderNodes(nodes: Inline[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (node.t) {
      case "text":
        return node.v;

      case "br":
        return <br key={key} />;

      case "code":
        return (
          <code
            key={key}
            className="rounded-xs bg-paper-2 px-1.5 py-0.5 text-[0.9em] text-navy-800"
          >
            {node.v}
          </code>
        );

      case "strong":
        return <strong key={key}>{renderNodes(node.c, key)}</strong>;

      case "em":
        return <em key={key}>{renderNodes(node.c, key)}</em>;

      case "del":
        return <del key={key}>{renderNodes(node.c, key)}</del>;

      case "image": {
        const src = safeSrc(node.src);
        if (!src) return node.alt;
        // Media-library images have unknown dimensions, which `next/image`
        // requires; Markdown cannot supply them.
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={key}
            src={src}
            alt={node.alt}
            loading="lazy"
            decoding="async"
            className="inline-block max-w-full align-middle"
          />
        );
      }

      default: {
        const href = safeHref(node.href);
        if (!href) return renderNodes(node.c, key);

        if (href.startsWith("/") || href.startsWith("#")) {
          return (
            <Link key={key} href={href} title={node.title}>
              {renderNodes(node.c, key)}
            </Link>
          );
        }

        return (
          <a
            key={key}
            href={href}
            title={node.title}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {renderNodes(node.c, key)}
          </a>
        );
      }
    }
  });
}

const inline = (text: string, keyPrefix: string) =>
  renderNodes(parseInline(text), keyPrefix);

/* -------------------------------------------------------------------------- */
/*  Block rendering                                                           */
/* -------------------------------------------------------------------------- */

function renderBlocks(blocks: Block[], keyPrefix: string): ReactNode[] {
  return blocks.map((block, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (block.kind) {
      case "heading": {
        const children = inline(block.text, key);
        if (block.level === 2) {
          return (
            <h2 key={key} id={block.id}>
              {children}
            </h2>
          );
        }
        if (block.level === 3) {
          return (
            <h3 key={key} id={block.id}>
              {children}
            </h3>
          );
        }
        return (
          <h4 key={key} id={block.id}>
            {children}
          </h4>
        );
      }

      case "list": {
        const items = block.items.map((item, i) => (
          <li key={`${key}-${i}`}>
            {inline(item.text, `${key}-${i}`)}
            {item.blocks.length > 0 && renderBlocks(item.blocks, `${key}-${i}-b`)}
          </li>
        ));

        return block.ordered ? (
          <ol key={key} start={block.start === 1 ? undefined : block.start}>
            {items}
          </ol>
        ) : (
          <ul key={key}>{items}</ul>
        );
      }

      case "quote": {
        // A one-paragraph quote renders its text directly, so the common case
        // keeps the tighter markup the article styles are built around.
        const first = block.blocks[0];
        const simple =
          block.blocks.length === 1 && first.kind === "paragraph" ? first : null;

        return (
          <blockquote key={key}>
            {simple ? inline(simple.text, key) : renderBlocks(block.blocks, key)}
          </blockquote>
        );
      }

      case "image": {
        const src = safeSrc(block.src);
        if (!src) return null;
        return (
          <figure key={key} className="!my-10">
            {/* eslint-disable-next-line @next/next/no-img-element --
                Body images come from the media library at unknown
                dimensions; `next/image` needs either a size or `fill`,
                and neither is knowable from Markdown. */}
            <img
              src={src}
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
      }

      case "code":
        return (
          <pre key={key} dir="ltr" className="code-block">
            <code>{block.text}</code>
          </pre>
        );

      case "table":
        return (
          <div key={key} className="table-scroll">
            <table>
              <thead>
                <tr>
                  {block.header.map((cell, i) => (
                    <th key={`${key}-h-${i}`} style={{ textAlign: block.align[i] }}>
                      {inline(cell, `${key}-h-${i}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={`${key}-r-${r}`}>
                    {row.map((cell, c) => (
                      <td
                        key={`${key}-r-${r}-${c}`}
                        style={{ textAlign: block.align[c] }}
                      >
                        {inline(cell, `${key}-r-${r}-${c}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "rule":
        return <hr key={key} className="hairline !my-12" />;

      default:
        return <p key={key}>{inline(block.text, key)}</p>;
    }
  });
}

export function RichText({
  source,
  className = "prose-fa",
}: {
  source: string;
  className?: string;
}) {
  return (
    <div className={className}>{renderBlocks(parseRichText(source), "b")}</div>
  );
}
