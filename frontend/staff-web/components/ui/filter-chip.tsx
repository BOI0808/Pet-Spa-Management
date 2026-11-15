import type { ButtonHTMLAttributes } from "react";

type FilterChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { active: boolean };

/** Lọc nhanh danh sách (`.chip` của ui-demo); đang chọn thì nền Ink. */
export function FilterChip({ active, className = "", children, ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium ${
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-[#a9c6cb]"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
