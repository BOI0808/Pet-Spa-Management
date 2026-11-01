import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "danger-solid" | "ghost" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Tối đa một nút `primary` mỗi màn (REVIEW_LOG của ui-demo). */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rộng hết vùng chứa. */
  block?: boolean;
  /** Đang gửi: hiện spinner + “Đang gửi…”, tự vô hiệu hóa để chống bấm đúp (SA 6.6). */
  loading?: boolean;
};

// Lớp theo `.btn-*` của ui-demo.
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-lagoon text-white hover:bg-lagoon-700",
  secondary: "border-lagoon bg-white text-lagoon-700 hover:bg-lagoon-25",
  danger: "border-danger bg-white text-danger hover:bg-danger-50",
  "danger-solid": "border-transparent bg-danger text-white hover:bg-[#952C22]",
  ghost: "border-transparent bg-transparent text-ink hover:bg-line-soft",
  quiet: "border-line bg-mist text-ink hover:bg-white",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "min-h-[34px] px-3 text-[13px]",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-[22px] text-[15px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  // Đang gửi vẫn giữ màu của nút như ui-demo; chỉ nút bị khóa mới xám (`.btn:disabled`).
  const stateClass = disabled
    ? "cursor-not-allowed border-transparent bg-[#E5ECEE] text-[#869AA0]"
    : `${VARIANT_CLASS[variant]} ${loading ? "cursor-progress" : "cursor-pointer"}`;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors max-[640px]:whitespace-normal max-[640px]:text-center max-[640px]:leading-[18px] ${stateClass} ${SIZE_CLASS[size]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current/40 border-t-current" />
          Đang gửi…
        </>
      ) : (
        children
      )}
    </button>
  );
}
