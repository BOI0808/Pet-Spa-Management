import { Icon } from "@/components/icons";
import { getErrorMessage, isRateLimitedError } from "@/lib/api/errors";

/**
 * Thông báo lỗi nội tuyến, đặt ngay tại chỗ thao tác (vd. 409: “Mốc giờ vừa kín…”).
 * 429 dùng kiểu cảnh báo kèm đồng hồ như ui-demo (CW-02); còn lại dùng kiểu lỗi.
 */
export function ErrorAlert({ error, className = "" }: { error: unknown; className?: string }) {
  if (!error) return null;

  const rateLimited = isRateLimitedError(error);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${
        rateLimited ? "border-[#F1D9A2] bg-[#FFF6E3]" : "border-[#EFC3BE] bg-danger-50"
      } ${className}`}
    >
      <Icon
        name={rateLimited ? "timer" : "x-circle"}
        className={`mt-px size-[18px] ${rateLimited ? "text-[#B87400]" : "text-danger"}`}
      />
      <div>{getErrorMessage(error)}</div>
    </div>
  );
}
