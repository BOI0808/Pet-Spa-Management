import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "danger-solid" | "ghost" | "quiet" | "hero" | "hero-ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleProps = {
  /** Tối đa một nút `primary` mỗi màn (REVIEW_LOG của ui-demo). */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rộng hết vùng chứa. */
  block?: boolean;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleProps & {
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
  // Nút trên nền Lagoon (`.hero .btn-primary`, `.hero .btn-ghost` của ui-demo).
  hero: "border-transparent bg-white text-lagoon-700 hover:bg-lagoon-50",
  "hero-ghost": "border-white/40 bg-transparent text-white hover:bg-white/10",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "min-h-[34px] px-3 text-[13px]",
  // Web nhân viên: vùng chạm tối thiểu 44px (SA 6.1, Design-System 3); customer-web giữ 40px.
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-[22px] text-[15px]",
};

const baseClass =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold leading-none transition-colors max-[640px]:whitespace-normal max-[640px]:text-center max-[640px]:leading-[18px]";

function layoutClass(size: ButtonSize, block: boolean) {
  return `${baseClass} ${SIZE_CLASS[size]} ${block ? "w-full" : ""}`;
}

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
      className={`${layoutClass(size, block)} ${stateClass} ${className}`}
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

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps;

/** Liên kết trông như nút (`a.btn` của ui-demo), dùng khi bấm là chuyển màn. */
export function ButtonLink({
  variant = "secondary",
  size = "md",
  block = false,
  className = "",
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={`${layoutClass(size, block)} ${VARIANT_CLASS[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
