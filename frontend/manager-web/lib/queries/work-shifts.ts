import { useQuery } from "@tanstack/react-query";
import { listWorkShifts } from "@/lib/api/endpoints/work-shifts";
import { toStoreIso } from "@/lib/time";

// Backend giới hạn `pageSize` tối đa 100; một ngày không có nhiều hơn 100 ca của nhân viên spa.
const SHIFT_PAGE_SIZE = 100;

export const workShiftKeys = {
  all: ["work-shifts"] as const,
  day: (date: string) => [...workShiftKeys.all, "day", date] as const,
};

/** Các ca làm giao với một ngày theo múi giờ cửa hàng (`date` dạng “YYYY-MM-DD”), cho biểu đồ tiến độ MW-02. */
export function useWorkShiftsOfDay(date: string) {
  return useQuery({
    queryKey: workShiftKeys.day(date),
    queryFn: () =>
      listWorkShifts({ from: toStoreIso(date, "00:00"), to: toStoreIso(date, "23:59"), page: 1, pageSize: SHIFT_PAGE_SIZE }),
  });
}
