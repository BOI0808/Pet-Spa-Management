import { Icon } from "@/components/icons";

/**
 * Lỗi của một ô nhập, nằm ngay dưới trường (mục 6.1 – Input; 6.6 – Validation rules).
 * Dùng với React Hook Form: `<FieldError id="phone-error" message={errors.phone?.message} />`
 * và gắn `aria-describedby="phone-error"` vào ô nhập.
 */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
      <Icon name="alert" className="mt-px size-3.5" />
      {message}
    </p>
  );
}
