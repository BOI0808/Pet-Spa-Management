import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPayments, recordCounterPayment } from "@/lib/api/endpoints/payments";
import type { ApiError } from "@/lib/api/errors";
import type { PaymentPage, PaymentStatus } from "@/lib/api/types";
import { appointmentKeys } from "@/lib/queries/appointments";

/** Số dòng mỗi trang của bảng MW-10 (UI-Screens MW-10 vùng 3). */
export const PAYMENT_PAGE_SIZE = 20;

// Backend giới hạn `pageSize` tối đa 100. Thẻ số liệu “Chưa thanh toán” (G-07) tạm đếm trên một trang 100 khoản đầu.
const UNPAID_SUMMARY_PAGE_SIZE = 100;

// Mọi khóa thanh toán bắt đầu bằng `all` để một thao tác ghi tải lại cả bảng lẫn thẻ số liệu.
export const paymentKeys = {
  all: ["payments"] as const,
  list: (status: PaymentStatus | undefined, page: number) => [...paymentKeys.all, "list", status ?? "all", page] as const,
  unpaidSummary: () => [...paymentKeys.all, "unpaid-summary"] as const,
};

/** Một trang khoản thanh toán toàn cửa hàng; giữ trang cũ trên màn hình trong lúc tải trang mới. */
export function usePayments(status: PaymentStatus | undefined, page: number) {
  return useQuery({
    queryKey: paymentKeys.list(status, page),
    queryFn: () => listPayments({ status, page, pageSize: PAYMENT_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

export type UnpaidSummary = {
  /** Tổng số khoản chưa thanh toán (`total` của backend). */
  count: number;
  /** Tổng tiền của các khoản đã tải về. */
  amount: number;
  /** Số khoản đã tải về để cộng tiền. */
  loadedCount: number;
  /** `true` khi `count` lớn hơn `loadedCount`, tức `amount` chưa phải tổng tiền của mọi khoản. */
  isPartial: boolean;
};

function summarizeUnpaid(page: PaymentPage): UnpaidSummary {
  return {
    count: page.total,
    amount: page.items.reduce((sum, item) => sum + item.amount, 0),
    loadedCount: page.items.length,
    isPartial: page.total > page.items.length,
  };
}

/** Số liệu cho thẻ “Chưa thanh toán” và số đếm trên chip lọc (UI-Screens MW-10 vùng 1, 2). */
export function useUnpaidSummary() {
  return useQuery({
    queryKey: paymentKeys.unpaidSummary(),
    queryFn: () => listPayments({ status: "Unpaid", page: 1, pageSize: UNPAID_SUMMARY_PAGE_SIZE }),
    select: summarizeUnpaid,
  });
}

/** Các khoản chưa thanh toán trong trang 100 khoản đầu, dùng chung dữ liệu với `useUnpaidSummary` (MW-02 “Cần chú ý”). */
export function useUnpaidPayments() {
  return useQuery({
    queryKey: paymentKeys.unpaidSummary(),
    queryFn: () => listPayments({ status: "Unpaid", page: 1, pageSize: UNPAID_SUMMARY_PAGE_SIZE }),
    select: (page) => page.items,
  });
}

// Sau khi ghi nhận tải lại bảng, thẻ số liệu và dữ liệu lịch hẹn (Frontend-Architecture 5.1); lỗi 409 (sai thời điểm,
// khoản đã được thu ở nơi khác…) cũng tải lại để thấy dữ liệu mới nhất.
export function useRecordCounterPayment() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
    ]);
  return useMutation({
    mutationFn: recordCounterPayment,
    onSuccess: invalidate,
    onError: (error: ApiError) => {
      if (error.status === 409) return invalidate();
    },
  });
}
