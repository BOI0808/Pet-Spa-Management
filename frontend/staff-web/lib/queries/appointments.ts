import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkInSpaAppointment,
  completeAppointment,
  createSpaAppointment,
  getAppointment,
  getSpaSlots,
  listAppointmentPayments,
  listAppointmentPhotos,
  listAppointments,
  respondCostConfirmation,
  startAppointment,
  updateServiceProgress,
  uploadAppointmentPhoto,
  weightCheckHotelAppointment,
  type AppointmentListParams,
  type SpaSlotParams,
  type UploadPhotoParams,
} from "@/lib/api/endpoints/appointments";
import type { Photo, ServiceProgressRequest } from "@/lib/api/types";
import { petKeys } from "@/lib/queries/pets";

// Cùng khóa với customer-web.
export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: AppointmentListParams) => ["appointments", "list", params] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  payments: (appointmentId: string) => ["appointments", "detail", appointmentId, "payments"] as const,
  photos: (appointmentId: string) => ["appointments", "detail", appointmentId, "photos"] as const,
};

// Lịch trong ngày đổi theo tiến độ ở cửa hàng: tải lại 60 giây/lần (UI-Screens SW-02, Đề xuất).
const APPOINTMENT_REFETCH_MS = 60_000;

type QueryToggle = { enabled?: boolean };

export const spaSlotKeys = {
  all: ["spa-slots"] as const,
  list: (params: SpaSlotParams) => ["spa-slots", params] as const,
};

// Khách đứng ở quầy trong lúc lễ tân chọn giờ: tải lại định kỳ để mốc vừa kín, vừa trôi qua không còn hiện là chọn được.
const SPA_SLOT_REFETCH_MS = 60_000;

export function useSpaSlots(params: SpaSlotParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: spaSlotKeys.list(params),
    queryFn: () => getSpaSlots(params),
    enabled,
    refetchInterval: SPA_SLOT_REFETCH_MS,
  });
}

export function useCreateSpaAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSpaAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
    },
    // 409: tải lại mốc giờ (SA 6.6).
    onError: (error) => {
      if (error.code === "SLOT_FULL") void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
    },
  });
}

/** Danh sách lịch hẹn; tự tải lại 60 giây/lần để thấy lịch mới được giao, lịch vừa đổi trạng thái. */
export function useAppointments(params: AppointmentListParams) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: () => listAppointments(params),
    refetchInterval: APPOINTMENT_REFETCH_MS,
  });
}

type AppointmentQueryOptions = QueryToggle & {
  /** Tự tải lại 60 giây/lần: chỉ bật ở SW-03. Phiếu ở SW-02 không bật để mỗi phút không gọi thêm một request mỗi phiếu. */
  live?: boolean;
};

export function useAppointment(appointmentId: string, { enabled = true, live = false }: AppointmentQueryOptions = {}) {
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => getAppointment(appointmentId),
    enabled,
    refetchInterval: live ? APPOINTMENT_REFETCH_MS : false,
  });
}

export function useAppointmentPayments(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.payments(appointmentId),
    queryFn: () => listAppointmentPayments(appointmentId),
    enabled,
  });
}

/**
 * Tiếp nhận lịch spa (SW-07). Thành công hay lỗi 409 (quá giờ giữ chỗ, đã tiếp nhận, đã hủy) đều làm mới mọi khóa
 * `appointments` để danh sách và chi tiết hiện đúng trạng thái mới (SA 6.6).
 */
export function useCheckInSpa() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  return useMutation({ mutationFn: checkInSpaAppointment, onSuccess: invalidate, onError: invalidate });
}

/**
 * Đối chiếu cân nặng lịch lưu trú (SW-07 vùng 9). Hồ sơ thú cưng có thể đã cập nhật theo cân thực tế (OK, giảm nhóm)
 * nên làm mới cả khóa `pets`; lỗi cũng tải lại lịch để thấy trạng thái mới (SA 6.6).
 */
export function useWeightCheckHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: weightCheckHotelAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: petKeys.all });
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

/**
 * Lễ tân ghi nhận phản hồi chi phí mới của khách (SW-07·D1). Giống `useRespondCostConfirmation` của customer-web:
 * thành công hay lỗi đều tải lại lịch, vì yêu cầu có thể vừa hết hạn và backend đã hủy lịch.
 */
export function useRespondCostConfirmation(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accept: boolean) => respondCostConfirmation(appointmentId, { accept }),
    onSuccess: (_result, accept) => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      // Đồng ý: hồ sơ thú cưng cập nhật theo cân nặng thực tế.
      if (accept) void queryClient.invalidateQueries({ queryKey: petKeys.all });
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
  });
}

// ── Ảnh minh chứng (SW-11) – chép từ customer-web (useAppointmentPhotos), giữ cùng tên và cách nhớ URL ──
// URL ảnh do backend ký có hạn 1 giờ. Trong 40 phút đầu, lần tải lại giữ URL cũ của ảnh đã có để trình duyệt không tải
// lại ảnh; ảnh không hiển thị được (URL hết hạn) thì gọi `refreshUrls` để lấy URL mới.
const PHOTO_URL_REUSE_MS = 40 * 60_000;
const photoUrlCache = new Map<string, { url: string; fetchedAt: number }>();

/** Bỏ các URL đã quá thời gian dùng lại để bộ nhớ không lớn dần khi mở nhiều lịch. */
function pruneExpiredPhotoUrls(now: number) {
  for (const [photoId, entry] of photoUrlCache) {
    if (now - entry.fetchedAt >= PHOTO_URL_REUSE_MS) photoUrlCache.delete(photoId);
  }
}

/** Dữ liệu còn mới tính theo URL cũ nhất trong danh sách (URL có thể ký từ lần tải trước), không theo lúc tải lại. */
function photoStaleTime(photos: Photo[] | undefined, dataUpdatedAt: number) {
  if (!photos || photos.length === 0) return PHOTO_URL_REUSE_MS;
  const oldest = Math.min(...photos.map((photo) => photoUrlCache.get(photo.photoId)?.fetchedAt ?? dataUpdatedAt));
  return Math.max(0, oldest + PHOTO_URL_REUSE_MS - dataUpdatedAt);
}

const PHOTO_KIND_ORDER = { Before: 0, After: 1 } as const;

/** Ảnh Trước rồi Sau, cùng loại theo thời gian tải lên. */
function sortPhotos(photos: Photo[]) {
  return [...photos].sort(
    (a, b) => PHOTO_KIND_ORDER[a.kind] - PHOTO_KIND_ORDER[b.kind] || Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt),
  );
}

/**
 * GET /appointments/{id}/photos – FR-EXE-09. Khác customer-web: không tự tải lại định kỳ, vì ở SW-11 chính nhân viên
 * spa này là người tải ảnh lên và tải xong thì làm mới khóa ảnh (`useUploadPhoto`).
 */
export function useAppointmentPhotos(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: appointmentKeys.photos(appointmentId),
    queryFn: async () => {
      // Lấy mốc trước khi gọi: URL được ký sau mốc này nên tính hạn sớm hơn một chút, không bao giờ muộn hơn.
      const now = Date.now();
      pruneExpiredPhotoUrls(now);
      const photos = await listAppointmentPhotos(appointmentId);
      return sortPhotos(
        photos.map((photo): Photo => {
          const cached = photoUrlCache.get(photo.photoId);
          if (cached && now - cached.fetchedAt < PHOTO_URL_REUSE_MS) return { ...photo, url: cached.url };
          photoUrlCache.set(photo.photoId, { url: photo.url, fetchedAt: now });
          return photo;
        }),
      );
    },
    enabled,
    staleTime: (current) => photoStaleTime(current.state.data, current.state.dataUpdatedAt),
  });

  /** Bỏ URL đã nhớ của lịch này rồi tải lại; nhiều ảnh cùng hết hạn thì dùng chung một lần tải (`cancelRefetch: false`). */
  function refreshUrls() {
    query.data?.forEach((photo) => photoUrlCache.delete(photo.photoId));
    void queryClient.invalidateQueries(
      { queryKey: appointmentKeys.photos(appointmentId), exact: true },
      { cancelRefetch: false },
    );
  }

  return { ...query, refreshUrls };
}

/**
 * Tải ảnh trước/sau (SW-11 vùng 3, 4). Xong thì tải lại danh sách ảnh; trả về promise của lần tải lại để `mutateAsync`
 * chờ tới khi ảnh mới có trong danh sách, ô tải không nháy lại giữa chừng. 409 INVALID_TRANSITION (lịch vừa đổi trạng
 * thái ở nơi khác) thì tải lại cả chi tiết lịch để màn hiện đúng vùng tải ảnh (SA 6.6).
 */
export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: UploadPhotoParams) => uploadAppointmentPhoto(params),
    onSuccess: (_result, { appointmentId }) =>
      queryClient.invalidateQueries({ queryKey: appointmentKeys.photos(appointmentId), exact: true }),
    onError: (error, { appointmentId }) => {
      if (error.status === 409) void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
    },
  });
}

/**
 * Bắt đầu, hoàn tất lịch spa (SW-11 vùng 7). Thành công hay lỗi đều làm mới mọi khóa `appointments`: danh sách SW-02 đổi
 * trạng thái, hoàn tất thì có khoản thanh toán mới; lỗi 409 có thể do trạng thái đã đổi ở nơi khác (SA 6.6).
 */
export function useStartAppointment() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  return useMutation({ mutationFn: startAppointment, onSuccess: invalidate, onError: invalidate });
}

export function useCompleteAppointment() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  return useMutation({ mutationFn: completeAppointment, onSuccess: invalidate, onError: invalidate });
}

/** Đánh dấu một dịch vụ đã xong kèm ghi chú (SW-11 vùng 8). Thành công hay lỗi đều tải lại chi tiết lịch. */
export function useUpdateServiceProgress(appointmentId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
  return useMutation({
    mutationFn: ({ serviceId, ...body }: ServiceProgressRequest & { serviceId: string }) =>
      updateServiceProgress(appointmentId, serviceId, body),
    onSuccess: invalidate,
    onError: invalidate,
  });
}
