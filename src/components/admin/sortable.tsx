"use client";

import {useCallback, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/icon";

/**
 * Drag-and-drop reordering.
 *
 * Built on the native HTML5 drag events rather than a library: the whole
 * behaviour is about fifty lines, and pulling in a drag-and-drop package for
 * it would add more bundle weight than the entire admin section editor.
 *
 * Accessibility is the reason this is not *only* drag-and-drop. Pointer
 * dragging is unusable with a keyboard, unreliable with assistive tech and
 * awkward on a touch screen, so every row also carries explicit up/down
 * buttons. Those are the primary control; dragging is the shortcut.
 */

export interface SortableRenderProps {
  /** Attach to the drag handle. */
  handleProps: {
    draggable: true;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
  };
  index: number;
  isDragging: boolean;
  moveUp: () => void;
  moveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function SortableList<T>({
  items,
  getKey,
  onReorder,
  children,
  className,
  itemClassName,
}: {
  items: T[];
  getKey: (item: T, index: number) => string;
  /** Receives the fully reordered array. */
  onReorder: (next: T[]) => void;
  children: (item: T, props: SortableRenderProps) => ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to || to < 0 || to >= items.length) return;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    },
    [items, onReorder],
  );

  const handleDragStart = (index: number) => (event: DragEvent<HTMLElement>) => {
    setDraggingIndex(index);
    event.dataTransfer.effectAllowed = "move";
    // Firefox refuses to start a drag unless some data is set.
    event.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setOverIndex(null);
  };

  const handleDragOver = (index: number) => (event: DragEvent<HTMLElement>) => {
    if (draggingIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };

  /**
   * The source index comes from state rather than a ref.
   *
   * `dragstart` commits `draggingIndex` and re-renders long before `drop`
   * fires, so by the time this handler exists the value is already current —
   * and reading state keeps the drag logic out of ref-during-render territory.
   */
  const handleDrop = (index: number) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const from = draggingIndex;
    handleDragEnd();
    if (from === null) return;
    move(from, index);
  };

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {items.map((item, index) => {
        const dragging = draggingIndex === index;
        const isOver = overIndex === index && draggingIndex !== index;

        return (
          <li
            key={getKey(item, index)}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            className={cn(
              "transition-[opacity,transform] duration-150",
              dragging && "opacity-40",
              isOver && "translate-y-0.5",
              itemClassName,
            )}
          >
            <div
              className={cn(
                isOver &&
                  "rounded-sm outline-2 -outline-offset-2 outline-dashed outline-navy-500",
              )}
            >
              {children(item, {
                handleProps: {
                  draggable: true,
                  onDragStart: handleDragStart(index),
                  onDragEnd: handleDragEnd,
                },
                index,
                isDragging: dragging,
                moveUp: () => move(index, index - 1),
                moveDown: () => move(index, index + 1),
                canMoveUp: index > 0,
                canMoveDown: index < items.length - 1,
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*  Handle                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The grip plus its keyboard equivalents.
 *
 * The up/down buttons carry the real `aria-label`s; the grip is marked
 * `aria-hidden` because it is a pointer-only affordance that would otherwise
 * announce itself as an interactive element with no keyboard behaviour.
 */
export function DragHandle({
  handleProps,
  moveUp,
  moveDown,
  canMoveUp,
  canMoveDown,
  label,
}: Pick<
  SortableRenderProps,
  "handleProps" | "moveUp" | "moveDown" | "canMoveUp" | "canMoveDown"
> & { label: string }) {
  const buttonClass =
    "flex size-7 items-center justify-center rounded-xs text-muted transition-colors hover:bg-navy-900/[0.06] hover:text-navy-800 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <span
        {...handleProps}
        aria-hidden="true"
        title="برای جابه‌جایی بکشید"
        className="flex size-7 cursor-grab items-center justify-center rounded-xs text-muted-2 transition-colors hover:text-navy-700 active:cursor-grabbing"
      >
        <Icon name="grip" size={16} />
      </span>

      <div className="flex flex-col">
        <button
          type="button"
          onClick={moveUp}
          disabled={!canMoveUp}
          aria-label={`انتقال ${label} به بالا`}
          className={cn(buttonClass, "size-5")}
        >
          <Icon name="chevron-up" size={14} />
        </button>
        <button
          type="button"
          onClick={moveDown}
          disabled={!canMoveDown}
          aria-label={`انتقال ${label} به پایین`}
          className={cn(buttonClass, "size-5")}
        >
          <Icon name="chevron-down" size={14} />
        </button>
      </div>
    </div>
  );
}
