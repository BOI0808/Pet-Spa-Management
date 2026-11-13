"use client";

import { useRef, type KeyboardEvent } from "react";

export type TabItem<Value extends string> = { value: Value; label: string; count?: number };

type TabsProps<Value extends string> = {
  /** Tên nhóm tab cho trình đọc màn hình. */
  label: string;
  items: readonly TabItem<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  /** `id` của vùng nội dung tab để gắn `aria-controls`. */
  panelId?: string;
};

/**
 * Tab gạch chân Lagoon kèm số lượng (`.tabs` của ui-demo); hẹp thì cuộn ngang trong chính dải tab.
 * Bàn phím theo mẫu WAI-ARIA Tabs: chỉ tab đang chọn nhận Tab; mũi tên trái/phải, Home, End chuyển tab.
 */
export function Tabs<Value extends string>({ label, items, value, onChange, panelId }: TabsProps<Value>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    onChange(items[next].value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-5 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]"
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`-mb-px inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm ${
              selected
                ? "border-lagoon font-semibold text-lagoon-700"
                : "border-transparent font-medium text-muted hover:text-ink"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-[7px] text-xs leading-[18px] ${
                  selected ? "bg-lagoon-50 text-lagoon-700" : "bg-line-soft text-muted"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
