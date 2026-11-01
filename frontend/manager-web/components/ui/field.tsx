import type { ComponentProps, ReactNode } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { Icon } from "@/components/icons";

/** Thuộc tính Field gắn cho ô nhập để nhãn, gợi ý và lỗi đọc được bằng trình đọc màn hình. */
type FieldControlProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

type FieldProps = {
  id: string;
  label: string;
  /** Dấu * đỏ sau nhãn. */
  required?: boolean;
  hint?: string;
  /** Có lỗi thì hiện lỗi thay cho gợi ý. */
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/** Nhãn luôn ở trên ô (SA 6.1); `.field`, `.label`, `.hint` của ui-demo. */
export function Field({ id, label, required, hint, error, className = "", children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <label htmlFor={id} className="mb-1.5 text-[13px] font-semibold leading-[18px] text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <FieldError id={`${id}-error`} message={error} />
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

// `.input` của ui-demo: cao 42px (38px trong bảng – `compact`), viền Lagoon và vòng sáng khi focus; khi lỗi viền Danger kể cả lúc rê chuột.
const controlBaseClass =
  "w-full rounded-[10px] border bg-white text-sm text-ink transition-[border-color,box-shadow] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#EEF3F4] disabled:text-[#8FA2A7]";
const controlNormalClass =
  "border-line hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)]";
const controlInvalidClass = "border-danger focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)]";

function isInvalid(props: { "aria-invalid"?: ComponentProps<"input">["aria-invalid"] }) {
  return props["aria-invalid"] === true || props["aria-invalid"] === "true";
}

function controlClass(invalid: boolean, compact: boolean | undefined, padding: string, className: string) {
  return `${controlBaseClass} ${invalid ? controlInvalidClass : controlNormalClass} ${
    compact ? "h-[38px]" : "h-[42px]"
  } ${padding} ${className}`;
}

type InputProps = ComponentProps<"input"> & {
  /** Đơn vị nằm bên phải ô, ví dụ “đ”, “phút” (`.input-suffix` của ui-demo). */
  suffix?: string;
  /** Cao 38px cho ô trong bảng. */
  compact?: boolean;
};

/** Ô nhập dùng được với `register` của React Hook Form (React 19 nhận `ref` như prop thường). */
export function Input({ suffix, compact, className = "", ...rest }: InputProps) {
  const inputClass = controlClass(isInvalid(rest), compact, `pl-3 ${suffix ? "pr-11" : "pr-3"}`, className);

  if (!suffix) return <input className={inputClass} {...rest} />;

  return (
    <div className="relative">
      <input className={inputClass} {...rest} />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">{suffix}</span>
    </div>
  );
}

type SelectProps = ComponentProps<"select"> & {
  /** Cao 38px cho ô trong bảng. */
  compact?: boolean;
};

/** Ô chọn một giá trị (`.select` của ui-demo); mũi tên vẽ bằng biểu tượng `chev-d`. Dùng với `register` của React Hook Form. */
export function Select({ compact, className = "", children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select className={controlClass(isInvalid(rest), compact, "appearance-none pl-3 pr-9", className)} {...rest}>
        {children}
      </select>
      <Icon
        name="chev-d"
        className={`pointer-events-none absolute right-3 size-4 text-muted ${compact ? "top-[11px]" : "top-[13px]"}`}
      />
    </div>
  );
}

/** Ô nhập nhiều dòng (`.textarea` của ui-demo): tối thiểu 84px, chỉ co giãn theo chiều dọc. */
export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  const invalid = isInvalid(rest);
  return (
    <textarea
      className={`min-h-[84px] w-full resize-y rounded-[10px] border bg-white px-3 py-2.5 text-sm leading-5 text-ink transition-[border-color,box-shadow] focus-visible:outline-none ${
        invalid ? controlInvalidClass : controlNormalClass
      } ${className}`}
      {...rest}
    />
  );
}
