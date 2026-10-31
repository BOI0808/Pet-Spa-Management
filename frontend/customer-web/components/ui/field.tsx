import type { ComponentProps, ReactNode } from "react";
import { FieldError } from "@/components/feedback/field-error";
import { Icon, type IconName } from "@/components/icons";

/** Thuộc tính Field gắn cho ô nhập để nhãn, gợi ý và lỗi đọc được bằng trình đọc màn hình. */
export type FieldControlProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

type FieldProps = {
  id: string;
  label: string;
  /** Dấu * đỏ sau nhãn. */
  required?: boolean;
  /** “(không bắt buộc)” sau nhãn. */
  optional?: boolean;
  hint?: string;
  /** Có lỗi thì hiện lỗi thay cho gợi ý. */
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/** Nhãn luôn ở trên ô (SA 6.1); `.field`, `.label`, `.hint` của ui-demo. */
export function Field({ id, label, required, optional, hint, error, className = "", children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <label htmlFor={id} className="mb-1.5 text-[13px] font-semibold leading-[18px] text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
        {optional && <span className="font-normal text-muted"> (không bắt buộc)</span>}
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

type InputProps = ComponentProps<"input"> & {
  /** Biểu tượng bên trái ô (`.input-wrap` của ui-demo). */
  prefixIcon?: IconName;
};

// `.input` của ui-demo: cao 42px, viền Lagoon và vòng sáng khi focus; khi lỗi viền Danger kể cả lúc rê chuột.
const inputBaseClass =
  "h-[42px] w-full rounded-[10px] border bg-white pr-3 text-sm text-ink transition-[border-color,box-shadow] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#EEF3F4] disabled:text-[#8FA2A7]";
const inputNormalClass =
  "border-line hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)]";
const inputInvalidClass = "border-danger focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)]";

/** Ô nhập dùng được với `register` của React Hook Form (React 19 nhận `ref` như prop thường). */
export function Input({ prefixIcon, className = "", ...rest }: InputProps) {
  const invalid = rest["aria-invalid"] === true || rest["aria-invalid"] === "true";
  const inputClass = `${inputBaseClass} ${invalid ? inputInvalidClass : inputNormalClass} ${
    prefixIcon ? "pl-[38px]" : "pl-3"
  } ${className}`;

  if (!prefixIcon) return <input className={inputClass} {...rest} />;

  return (
    <div className="relative">
      <Icon name={prefixIcon} className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted" />
      <input className={inputClass} {...rest} />
    </div>
  );
}
