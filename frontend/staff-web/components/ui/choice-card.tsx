import type { ComponentProps, ReactNode } from "react";

type ChoiceCardProps = Omit<ComponentProps<"input">, "type" | "className" | "children"> & {
  /** Chấm tròn bên trái (`.radio-dot` của ui-demo), dùng khi thẻ có tiêu đề + mô tả như chọn tính cách. */
  showDot?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Thẻ chọn một (`.choice` của ui-demo) bọc ô radio thật bị ẩn, nên bàn phím (Tab, phím mũi tên) và
 * `register` của React Hook Form dùng như radio thường; trạng thái chọn vẽ bằng `:checked`.
 */
export function ChoiceCard({ showDot = false, className = "", children, ...input }: ChoiceCardProps) {
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 transition-colors hover:border-[#A9C6CB] has-checked:border-lagoon has-checked:bg-lagoon-25 has-checked:shadow-[inset_0_0_0_1px_var(--color-lagoon)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lagoon/40 ${className}`}
    >
      <input type="radio" className="peer sr-only" {...input} />
      {showDot && (
        <span
          aria-hidden="true"
          className="grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#9DB3B8] bg-white after:hidden after:size-[9px] after:rounded-full after:bg-lagoon peer-checked:border-lagoon peer-checked:after:block"
        />
      )}
      {children}
    </label>
  );
}
