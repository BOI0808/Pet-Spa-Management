import { Icon } from "@/components/icons";
import { getErrorMessage, isRateLimitedError } from "@/lib/api/errors";

type ErrorAlertProps = {
  error: unknown;
  /** Câu riêng của màn thay cho câu lấy từ error envelope (vd. CW-02 không nêu trường nào sai); 429 luôn dùng câu chung. */
  message?: string;
  className?: string;
};

/**
 * Thông báo lỗi nội tuyến, đặt ngay tại chỗ thao tác (vd. 409: “Mốc giờ vừa kín…”).
 * 429 dùng kiểu cảnh báo kèm đồng hồ như ui-demo (CW-02); còn lại dùng kiểu lỗi.
 */
export function ErrorAlert({ error, message, className = "" }: ErrorAlertProps) {
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
      <div>{rateLimited || !message ? getErrorMessage(error) : message}</div>
    </div>
  );
}
