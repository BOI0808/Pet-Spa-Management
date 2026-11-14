import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { cancelAppointment, updateAppointment } from "@/lib/api/endpoints/appointments";
import type { ApiError } from "@/lib/api/errors";
import type { UpdateAppointmentRequest } from "@/lib/api/types";
import { appointmentKeys, spaSlotKeys } from "@/lib/queries/appointments";
import { hotelAvailabilityKeys } from "@/lib/queries/hotel-booking";

/**
 * Lịch đã biết là quá hạn tự đổi/hủy nhờ 409 `CHANGE_WINDOW_CLOSED` (UI-Screens G-03: web không đọc được hạn cấu hình).
 * Gốc khóa riêng, không nằm dưới `appointments`, để làm mới lịch hẹn không xóa mất điều đã biết.
 */
export const changeWindowKeys = {
  closed: (appointmentId: string) => ["change-window-closed", appointmentId] as const,
};

// Lưu thêm vào sessionStorage để tải lại trang hoặc mở thẳng CW-10 vẫn biết lịch đã quá hạn. Chỉ là cờ hiển thị
// (không phải token, không phải dữ liệu cá nhân); không đọc được thì coi như chưa biết, backend vẫn chặn bằng 409.
const STORAGE_PREFIX = "ps-change-closed:";

function readStoredFlag(appointmentId: string) {
  try {
    return window.sessionStorage.getItem(STORAGE_PREFIX + appointmentId) === "1";
  } catch {
    return false;
  }
}

function storeFlag(appointmentId: string) {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + appointmentId, "1");
  } catch {
    // Trình duyệt chặn bộ nhớ phiên: chỉ giữ trong bộ nhớ của trang.
  }
}

/** Ghi nhận lịch đã quá hạn; dùng chung cho CW-09 và CW-10 trong phiên. */
export function markChangeWindowClosed(queryClient: QueryClient, appointmentId: string) {
  storeFlag(appointmentId);
  queryClient.setQueryData(changeWindowKeys.closed(appointmentId), true);
}

/** `true` khi backend đã trả `CHANGE_WINDOW_CLOSED` cho lịch này. Không gọi API. */
export function useChangeWindowClosed(appointmentId: string) {
  const { data } = useQuery({
    queryKey: changeWindowKeys.closed(appointmentId),
    queryFn: () => readStoredFlag(appointmentId),
    // Đọc ngay khi dựng để không chớp form rồi mới khóa (màn nằm sau SessionGate nên chỉ dựng ở trình duyệt).
    initialData: () => readStoredFlag(appointmentId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data === true;
}

/** Lỗi của thao tác đổi/hủy: quá hạn thì ghi nhận; mọi 409 đều tải lại chi tiết (SA 6.6). */
function handleChangeError(queryClient: QueryClient, appointmentId: string, error: ApiError) {
  if (error.code === "CHANGE_WINDOW_CLOSED") markChangeWindowClosed(queryClient, appointmentId);
  if (error.status === 409) {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId), exact: true });
  }
}

/** POST /appointments/{id}/cancel – CW-09·D1. */
export function useCancelAppointment(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelAppointment(appointmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      // Lịch hủy trả lại chỗ đã giữ.
      void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
      void queryClient.invalidateQueries({ queryKey: hotelAvailabilityKeys.all });
    },
    onError: (error) => handleChangeError(queryClient, appointmentId, error),
  });
}

/** PUT /appointments/{id} – CW-10. */
export function useUpdateAppointment(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAppointmentRequest) => updateAppointment(appointmentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
      void queryClient.invalidateQueries({ queryKey: hotelAvailabilityKeys.all });
    },
    onError: (error) => {
      handleChangeError(queryClient, appointmentId, error);
      // Hết chỗ: tải lại mốc giờ / còn chỗ (như CW-06, CW-07).
      if (error.code === "SLOT_FULL") void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
      if (error.code === "NO_CAPACITY") void queryClient.invalidateQueries({ queryKey: hotelAvailabilityKeys.all });
    },
  });
}
