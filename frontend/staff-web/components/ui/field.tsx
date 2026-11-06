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
  /** Chú thích trong ngoặc sau nhãn thay cho “không bắt buộc”, ví dụ “chỉ cần với chó” (`.opt` của ui-demo). */
  note?: string;
  hint?: string;
  /** Có lỗi thì hiện lỗi thay cho gợi ý. */
  error?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

const labelClass = "mb-1.5 text-[13px] font-semibold leading-[18px] text-ink";

function LabelText({ label, required, note }: { label: string; required?: boolean; note?: string }) {
  return (
    <>
      {label}
      {required && <span className="ml-0.5 text-danger">*</span>}
      {note && <span className="font-normal text-muted"> ({note})</span>}
    </>
  );
}

function HintOrError({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (error) return <FieldError id={`${id}-error`} message={error} />;
  if (!hint) return null;
  return (
    <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
      {hint}
    </p>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

/** Nhãn luôn ở trên ô (SA 6.1); `.field`, `.label`, `.hint` của ui-demo. */
export function Field({ id, label, required, optional, note, hint, error, className = "", children }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <label htmlFor={id} className={labelClass}>
        <LabelText label={label} required={required} note={note ?? (optional ? "không bắt buộc" : undefined)} />
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy(id, hint, error) })}
      <HintOrError id={id} hint={hint} error={error} />
    </div>
  );
}

type FieldSetProps = {
  id: string;
  legend: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** Nhóm lựa chọn (thẻ chọn loài, tính cách…): chú thích nhóm là `legend` thay cho `label`. */
export function FieldSet({ id, legend, required, hint, error, className = "", children }: FieldSetProps) {
  return (
    <fieldset aria-describedby={describedBy(id, hint, error)} className={`min-w-0 ${className}`}>
      <legend className={labelClass}>
        <LabelText label={legend} required={required} />
      </legend>
      {children}
      <HintOrError id={id} hint={hint} error={error} />
    </fieldset>
  );
}

type InputProps = ComponentProps<"input"> & {
  /** Biểu tượng bên trái ô (`.input-wrap` của ui-demo). */
  prefixIcon?: IconName;
  /** Đơn vị bên phải ô, ví dụ “kg”, “cm” (`.input-suffix` của ui-demo). */
  suffix?: string;
};

// `.input` của ui-demo: cao 42px, viền Lagoon và vòng sáng khi focus; khi lỗi viền Danger kể cả lúc rê chuột.
const controlBaseClass =
  "w-full rounded-[10px] border bg-white text-sm text-ink transition-[border-color,box-shadow] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#EEF3F4] disabled:text-[#8FA2A7]";
const controlNormalClass =
  "border-line hover:border-[#B7CDD1] focus:border-lagoon focus:shadow-[0_0_0_3px_rgba(11,110,120,0.18)]";
const controlInvalidClass = "border-danger focus:shadow-[0_0_0_3px_rgba(179,55,43,0.15)]";

function stateClass(ariaInvalid: ComponentProps<"input">["aria-invalid"]) {
  return ariaInvalid === true || ariaInvalid === "true" ? controlInvalidClass : controlNormalClass;
}

/** Ô nhập dùng được với `register` của React Hook Form (React 19 nhận `ref` như prop thường). */
export function Input({ prefixIcon, suffix, className = "", ...rest }: InputProps) {
  const inputClass = `h-[42px] ${controlBaseClass} ${stateClass(rest["aria-invalid"])} ${
    prefixIcon ? "pl-[38px]" : "pl-3"
  } ${suffix ? "pr-11" : "pr-3"} ${className}`;

  if (!prefixIcon && !suffix) return <input className={inputClass} {...rest} />;

  return (
    <div className="relative">
      {prefixIcon && (
        <Icon name={prefixIcon} className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted" />
      )}
      <input className={inputClass} {...rest} />
      {suffix && (
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-2.5 text-[13px] text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** `.textarea` của ui-demo: cao tối thiểu 84px, kéo giãn theo chiều dọc. */
export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`min-h-[84px] resize-y px-3 py-2.5 leading-5 ${controlBaseClass} ${stateClass(rest["aria-invalid"])} ${className}`}
      {...rest}
    />
  );
}
