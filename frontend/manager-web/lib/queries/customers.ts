import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLockedCustomers, unlockCustomerBooking } from "@/lib/api/endpoints/customers";
import type { ApiError } from "@/lib/api/errors";

export const customerKeys = {
  locked: ["customers", "locked"] as const,
};

/** GET /customers của Quản lý: khách đang bị khóa tự đặt lịch (MW-09). */
export function useLockedCustomers() {
  return useQuery({ queryKey: customerKeys.locked, queryFn: listLockedCustomers });
}

/**
 * POST /customers/{id}/unlock-booking (FR-BOOK-07). Sau khi gỡ khóa tải lại danh sách; lỗi 409 (khách đã được gỡ khóa) hoặc 404
 * cũng tải lại để dòng đó biến mất (Frontend-Architecture 5.1).
 */
export function useUnlockCustomerBooking() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: customerKeys.locked });
  return useMutation({
    mutationFn: unlockCustomerBooking,
    onSuccess: invalidate,
    onError: (error: ApiError) => {
      if (error.status === 409 || error.status === 404) return invalidate();
    },
  });
}
