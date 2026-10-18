import { Icon } from "@/components/icons";
import { getErrorMessage } from "@/lib/api/errors";

/**
 * Thông báo lỗi nội tuyến, đặt ngay tại chỗ thao tác (vd. 409: “Khung giờ đã kín…”).
 * Kiểu `.alert-danger` của ui-demo; nội dung lấy từ error envelope của Backend; không có `error` thì không hiển thị gì.
 */
export function ErrorAlert({ error }: { error: unknown }) {
  if (!error) return null;

  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#EFC3BE] bg-danger-50 px-4 py-3.5 leading-5">
      <Icon name="x-circle" className="mt-px size-[18px] text-danger" />
      <div>{getErrorMessage(error)}</div>
    </div>
  );
}