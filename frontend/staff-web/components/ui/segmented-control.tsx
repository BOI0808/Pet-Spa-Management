import type { ReactNode } from "react";

export type SegmentedOption<Value extends string> = { value: Value; label: string; icon?: ReactNode };

type SegmentedControlProps<Value extends string> = {
  /** Tên nhóm cho trình đọc màn hình. */
  label: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
};

/** Nhóm nút chọn một (`.seg` của ui-demo); hẹp thì cuộn ngang trong chính nhóm nút. */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-line bg-mist p-[3px] [scrollbar-width:none] ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex grow cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[9px] px-3.5 py-[7px] text-sm max-[640px]:gap-1 max-[640px]:px-2 ${
              selected ? "bg-white font-semibold text-lagoon-700 shadow-[0_1px_3px_rgba(20,50,58,.12)]" : "font-medium text-ink"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
