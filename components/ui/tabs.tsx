"use client";

import { useEffect, useImperativeHandle, useRef, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";

export interface SegmentItem<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Small muted number after the label, e.g. "1,248". */
  count?: ReactNode;
  disabled?: boolean;
}

export interface TabItem<V extends string = string> extends SegmentItem<V> {
  /** Id of the element this tab controls (sets aria-controls). */
  panelId?: string;
}

interface SegmentedBaseProps<V extends string> {
  value: V;
  onValueChange: (value: V) => void;
  /** Names the group for screen readers. */
  "aria-label": string;
  /** muted: grey track for use inside cards. page: blue-grey track on the page background. */
  track?: "muted" | "page";
  className?: string;
  /** Extra classes for every item, e.g. "max-md:flex-1" to stretch a full-width control on phones. */
  itemClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export interface TabsProps<V extends string> extends SegmentedBaseProps<V> {
  items: TabItem<V>[];
}

export interface SegmentedControlProps<V extends string> extends SegmentedBaseProps<V> {
  items: SegmentItem<V>[];
}

/**
 * Tab-style switch: role="tablist". Use when it swaps or filters the content below (e.g. client status).
 * On narrow screens it scrolls sideways inside itself instead of wrapping.
 */
export function Tabs<V extends string>(props: TabsProps<V>) {
  return <Segmented kind="tabs" {...props} />;
}

/** Segmented single-choice control: role="radiogroup". Use for a setting such as a date range. */
export function SegmentedControl<V extends string>(props: SegmentedControlProps<V>) {
  return <Segmented kind="radio" {...props} />;
}

function Segmented<V extends string>({
  kind,
  items,
  value,
  onValueChange,
  track = "muted",
  className,
  itemClassName,
  ref,
  "aria-label": ariaLabel,
}: SegmentedBaseProps<V> & { kind: "tabs" | "radio"; items: TabItem<V>[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => listRef.current as HTMLDivElement, []);

  // Keep the selected item in view when the strip is scrolled (phones), without scrolling the page.
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[data-selected="true"]');
    if (!list || !selected) return;
    const start = selected.offsetLeft - 4;
    const end = selected.offsetLeft + selected.offsetWidth + 4;
    if (start < list.scrollLeft) list.scrollLeft = start;
    else if (end > list.scrollLeft + list.clientWidth) list.scrollLeft = end - list.clientWidth;
  }, [value]);

  const enabled = items.filter((item) => !item.disabled);
  const focusValue = enabled.some((item) => item.value === value) ? value : enabled[0]?.value;

  // Arrow keys move and select (roving tabindex), Home/End jump to the ends.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = enabled.findIndex((item) => item.value === focusValue);
    const last = enabled.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index >= last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = index <= 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = enabled[next];
    if (!target) return;
    onValueChange(target.value);
    listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(target.value)}"]`)?.focus();
  }

  return (
    <div
      ref={listRef}
      role={kind === "tabs" ? "tablist" : "radiogroup"}
      aria-label={ariaLabel}
      aria-orientation={kind === "tabs" ? "horizontal" : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex w-fit max-w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-control p-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        track === "page" ? "bg-segment-track" : "bg-neutral-soft",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role={kind === "tabs" ? "tab" : "radio"}
            aria-selected={kind === "tabs" ? selected : undefined}
            aria-checked={kind === "radio" ? selected : undefined}
            aria-controls={kind === "tabs" ? (item as TabItem<V>).panelId : undefined}
            data-value={item.value}
            data-selected={selected}
            tabIndex={item.value === focusValue ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              // 36px tall; the ::before reaches over the track padding so the tap area is 44px.
              "relative inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] text-[13px] font-bold whitespace-nowrap transition-colors",
              "before:absolute before:inset-x-0 before:-inset-y-1",
              "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary",
              "disabled:pointer-events-none disabled:opacity-45",
              kind === "tabs" ? "px-3" : "px-3.5",
              selected ? "bg-surface text-text shadow-segment" : "text-text-muted hover:text-text",
              itemClassName,
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="text-xs font-bold text-text-muted tabular-nums">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
