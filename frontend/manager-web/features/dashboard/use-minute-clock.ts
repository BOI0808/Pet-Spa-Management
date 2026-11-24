import { useSyncExternalStore } from "react";

// Mốc phút hiện tại (mili giây, làm tròn xuống phút). Kiểm tra mỗi 10 giây nhưng chỉ báo đổi khi sang phút mới.
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 10_000);
  return () => clearInterval(timer);
}

const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;

// Trên server chưa có giờ của trình duyệt: trả `null` để không dựng nội dung phụ thuộc giờ (tránh lệch khi hydrate).
const getServerSnapshot = () => null;

/** Đồng hồ theo phút cho MW-02 (đường “Hiện tại”, đổi ngày lúc nửa đêm); `null` cho đến khi chạy ở trình duyệt. */
export function useMinuteClock() {
  return useSyncExternalStore<number | null>(subscribe, getSnapshot, getServerSnapshot);
}
