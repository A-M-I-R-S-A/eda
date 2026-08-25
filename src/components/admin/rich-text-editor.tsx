"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { fa } from "@/lib/utils/persian";
import { RichText } from "@/lib/content/rich-text";
import { Icon, type IconName } from "@/components/ui/icon";
import { MediaPickerDialog } from "./media-picker";

/**
 * Persian rich-text editor.
 *
 * A toolbar-driven Markdown editor with a live preview, rather than a
 * `contentEditable` WYSIWYG. That is a deliberate choice, and the reasons are
 * specific to this project:
 *
 *  • **RTL correctness.** `contentEditable` handles bidirectional text badly —
 *    caret placement around Latin fragments inside Persian prose, selection
 *    across direction boundaries and list indentation all break in ways that
 *    differ per browser. A plain textarea has none of those problems.
 *
 *  • **Safety.** The stored value is the Markdown subset that `RichText`
 *    parses into React elements — never HTML, never `dangerouslySetInnerHTML`.
 *    A WYSIWYG stores markup, which would put stored-XSS back on the table for
 *    a role that can publish to the public site.
 *
 *  • **Fidelity.** The preview uses the *same* renderer the public site uses,
 *    so what an editor sees is what visitors get — including the site's own
 *    Persian typography.
 */

interface ToolbarAction {
  icon: IconName;
  label: string;
  /** Wraps the selection. */
  wrap?: [string, string];
  /** Prefixes each selected line. */
  linePrefix?: string;
  /** Inserted at the caret when nothing is selected. */
  block?: string;
}

const ACTIONS: (ToolbarAction | "divider")[] = [
  { icon: "article", label: "عنوان بزرگ", linePrefix: "## " },
  { icon: "list", label: "عنوان کوچک", linePrefix: "### " },
  "divider",
  { icon: "edit", label: "متن پررنگ", wrap: ["**", "**"] },
  { icon: "quote", label: "نقل‌قول", linePrefix: "> " },
  "divider",
  { icon: "list", label: "فهرست نقطه‌ای", linePrefix: "- " },
  { icon: "columns", label: "فهرست شماره‌دار", linePrefix: "1. " },
  "divider",
  { icon: "link", label: "پیوند", wrap: ["[", "](https://)"] },
  { icon: "code", label: "کد", wrap: ["`", "`"] },
  { icon: "filter", label: "خط جداکننده", block: "\n---\n" },
];

export function RichTextEditor({
  name,
  value,
  onChange,
  csrfToken,
  rows = 16,
  placeholder,
  invalid,
  id,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  csrfToken?: string;
  rows?: number;
  placeholder?: string;
  invalid?: boolean;
  id?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  /**
   * Applies a toolbar action to the current selection.
   *
   * Selection is restored afterwards so a run of formatting clicks behaves the
   * way it does in any other editor, instead of dropping the caret to the end
   * of the field after every press.
   */
  const apply = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart: start, selectionEnd: end } = textarea;
      const selected = value.slice(start, end);

      let next = value;
      let caretStart = start;
      let caretEnd = end;

      if (action.wrap) {
        const [before, after] = action.wrap;
        const inner = selected || "متن";
        next = value.slice(0, start) + before + inner + after + value.slice(end);
        caretStart = start + before.length;
        caretEnd = caretStart + inner.length;
      } else if (action.linePrefix) {
        // Expand the selection to whole lines so prefixing a partial
        // selection still produces valid Markdown.
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", end);
        const sliceEnd = lineEnd === -1 ? value.length : lineEnd;
        const block = value.slice(lineStart, sliceEnd) || "متن";

        const prefixed = block
          .split("\n")
          .map((line, index) =>
            action.linePrefix === "1. "
              ? `${index + 1}. ${line.replace(/^\d+[.)]\s*/, "")}`
              : line.startsWith(action.linePrefix as string)
                ? line
                : `${action.linePrefix}${line.replace(/^([#>-]+|\d+[.)])\s*/, "")}`,
          )
          .join("\n");

        next = value.slice(0, lineStart) + prefixed + value.slice(sliceEnd);
        caretStart = lineStart;
        caretEnd = lineStart + prefixed.length;
      } else if (action.block) {
        next = value.slice(0, start) + action.block + value.slice(end);
        caretStart = caretEnd = start + action.block.length;
      }

      onChange(next);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(caretStart, caretEnd);
      });
    },
    [value, onChange],
  );

  const insertImage = (url: string, alt: string) => {
    const textarea = textareaRef.current;
    const snippet = `\n![${alt}](${url})\n`;
    const start = textarea?.selectionStart ?? value.length;
    onChange(value.slice(0, start) + snippet + value.slice(start));
  };

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-sm border bg-white",
        invalid ? "border-danger/60" : "border-line-2",
      )}
    >
      {/* The value the surrounding form actually submits. */}
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper-2/60 px-2 py-1.5">
        {ACTIONS.map((action, index) =>
          action === "divider" ? (
            <span
              key={`d-${index}`}
              aria-hidden="true"
              className="mx-1 h-5 w-px bg-line-2"
            />
          ) : (
            <button
              key={action.label}
              type="button"
              onClick={() => apply(action)}
              title={action.label}
              aria-label={action.label}
              disabled={preview}
              className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800 disabled:opacity-40"
            >
              <Icon name={action.icon} size={16} />
            </button>
          ),
        )}

        {csrfToken && (
          <button
            type="button"
            onClick={() => setMediaOpen(true)}
            title="درج تصویر"
            aria-label="درج تصویر"
            disabled={preview}
            className="flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800 disabled:opacity-40"
          >
            <Icon name="image" size={16} />
          </button>
        )}

        <span className="flex-1" />

        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          aria-pressed={preview}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-xs px-2.5 text-[0.75rem] font-medium transition-colors",
            preview
              ? "bg-navy-900 text-white"
              : "text-muted hover:bg-navy-900/[0.06] hover:text-navy-800",
          )}
        >
          <Icon name={preview ? "edit" : "eye"} size={14} />
          {preview ? "ویرایش" : "پیش‌نمایش"}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[16rem] p-5">
          {value.trim() ? (
            <RichText source={value} className="prose-fa" />
          ) : (
            <p className="py-12 text-center text-[0.875rem] text-muted-2">
              متنی برای پیش‌نمایش وارد نشده است.
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          id={id}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          dir="rtl"
          aria-invalid={invalid || undefined}
          className="w-full resize-y border-0 px-4 py-3.5 text-[0.9375rem] leading-[2.1] focus:outline-none"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper-2/40 px-4 py-2 text-[0.75rem] text-muted-2">
        <span>
          قالب‌بندی با Markdown: <bdi dir="ltr">## عنوان</bdi> ·{" "}
          <bdi dir="ltr">**پررنگ**</bdi> · <bdi dir="ltr">- فهرست</bdi>
        </span>
        <span className="tabular-nums">{fa(words)} واژه</span>
      </div>

      {csrfToken && (
        <MediaPickerDialog
          open={mediaOpen}
          onClose={() => setMediaOpen(false)}
          onSelect={(asset) => insertImage(asset.url, asset.alt || asset.title)}
          csrfToken={csrfToken}
          kind="image"
          title="درج تصویر در متن"
        />
      )}
    </div>
  );
}
