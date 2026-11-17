import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSpaAppointment,
  getAppointment,
  getSpaSlots,
  listAppointmentPayments,
  listAppointmentPhotos,
  listAppointments,
  type AppointmentListParams,
  type SpaSlotParams,
} from "@/lib/api/endpoints/appointments";
import type { AppointmentDetail, AppointmentStatus, Photo } from "@/lib/api/types";

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: AppointmentListParams) => ["appointments", "list", params] as const,
  infinite: (params: AppointmentListParams) => ["appointments", "infinite", params] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  payments: (appointmentId: string) => ["appointments", "detail", appointmentId, "payments"] as const,
  photos: (appointmentId: string) => ["appointments", "detail", appointmentId, "photos"] as const,
};

export const spaSlotKeys = {
  all: ["spa-slots"] as const,
  list: (params: SpaSlotParams) => ["spa-slots", params] as const,
};

// Khách có thể ở màn chọn giờ lâu: tải lại định kỳ để mốc vừa kín, vừa trôi qua không còn hiện là chọn được.
const SPA_SLOT_REFETCH_MS = 60_000;

// Lịch đang ở cửa hàng thay đổi theo tiến độ chăm sóc: chi tiết tải lại 30 giây/lần (Frontend-Architecture 5.1).
const LIVE_DETAIL_REFETCH_MS = 30_000;
const LIVE_STATUSES: readonly AppointmentStatus[] = ["Received", "InProgress"];

type QueryToggle = { enabled?: boolean };

export function useSpaSlots(params: SpaSlotParams, { enabled = true }: QueryToggle = {}) {
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

export function useAppointments(params: AppointmentListParams, { enabled = true }: QueryToggle = {}) {
  return useQuery({ queryKey: appointmentKeys.list(params), queryFn: () => listAppointments(params), enabled });
}

/**
 * Gộp danh sách của nhiều trạng thái: API chỉ lọc một trạng thái mỗi lần (G-06) nên gọi song song từng trạng thái,
 * mỗi trạng thái một trang cỡ `pageSize`. `total` là tổng số thật từ backend, `truncated` khi có trạng thái
 * nhiều hơn một trang (phần dư không tải).
 */
export function useAppointmentsByStatuses(
  statuses: readonly AppointmentStatus[],
  params: Omit<AppointmentListParams, "status" | "page">,
) {
  return useQueries({
    queries: statuses.map((status) => {
      const listParams = { ...params, status, page: 1 };
      return { queryKey: appointmentKeys.list(listParams), queryFn: () => listAppointments(listParams) };
    }),
    combine: (results) => {
      const error = results.find((result) => result.isError)?.error ?? null;
      const pages = results.map((result) => result.data);
      const loaded = pages.every((page) => page !== undefined);
      return {
        isPending: results.some((result) => result.isPending),
        error,
        items: loaded ? pages.flatMap((page) => page?.items ?? []) : [],
        total: loaded ? pages.reduce((sum, page) => sum + (page?.total ?? 0), 0) : undefined,
        truncated: pages.some((page) => page !== undefined && page.total > page.items.length),
        refetch: () => results.forEach((result) => void result.refetch()),
      };
    },
  });
}

/** Danh sách tải thêm từng trang (“Xem thêm” ở CW-11); `page` do hook tự tăng. */
export function useInfiniteAppointments(params: Omit<AppointmentListParams, "page">, { enabled = true }: QueryToggle = {}) {
  return useInfiniteQuery({
    queryKey: appointmentKeys.infinite(params),
    queryFn: ({ pageParam }) => listAppointments({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled,
  });
}

type AppointmentQueryOptions = QueryToggle & {
  /** Tải lại định kỳ khi lịch đang ở cửa hàng; chỉ bật ở CW-09, danh sách không cần. */
  live?: boolean;
};

export function useAppointment(appointmentId: string, { enabled = true, live = false }: AppointmentQueryOptions = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: async () => {
      const previous = queryClient.getQueryData<AppointmentDetail>(appointmentKeys.detail(appointmentId));
      const next = await getAppointment(appointmentId);
      // Đổi trạng thái (vd. vừa hoàn tất) thì khoản thanh toán, ảnh minh chứng có thể vừa phát sinh: tải lại.
      if (previous && previous.status !== next.status) {
        void queryClient.invalidateQueries({ queryKey: appointmentKeys.payments(appointmentId), exact: true });
        void queryClient.invalidateQueries({ queryKey: appointmentKeys.photos(appointmentId), exact: true });
      }
      return next;
    },
    enabled,
    refetchInterval: (query) =>
      live && query.state.data && LIVE_STATUSES.includes(query.state.data.status) ? LIVE_DETAIL_REFETCH_MS : false,
  });
}

export function useAppointmentPayments(appointmentId: string, { enabled = true }: QueryToggle = {}) {
  return useQuery({
    queryKey: appointmentKeys.payments(appointmentId),
    queryFn: () => listAppointmentPayments(appointmentId),
    enabled,
  });
}

// URL ảnh do backend ký có hạn 1 giờ. Trong 40 phút đầu, lần tải lại giữ URL cũ của ảnh đã có để trình duyệt
// không tải lại ảnh mỗi 30 giây; ảnh không hiển thị được (URL hết hạn) thì gọi `refreshUrls` để lấy URL mới.
const PHOTO_URL_REUSE_MS = 40 * 60_000;
const photoUrlCache = new Map<string, { url: string; fetchedAt: number }>();

/** Bỏ các URL đã quá thời gian dùng lại để bộ nhớ không lớn dần khi khách xem nhiều lịch. */
function pruneExpiredPhotoUrls(now: number) {
  for (const [photoId, entry] of photoUrlCache) {
    if (now - entry.fetchedAt >= PHOTO_URL_REUSE_MS) photoUrlCache.delete(photoId);
  }
}

/**
 * Thời gian dữ liệu còn mới tính theo URL cũ nhất trong danh sách, không theo lúc tải lại, vì lần tải lại có thể giữ
 * URL ký từ trước: URL ký phút 0, tải lại phút 35 thì dữ liệu chỉ còn mới tới phút 40, không phải phút 75.
 */
function photoStaleTime(photos: Photo[] | undefined, dataUpdatedAt: number) {
  if (!photos || photos.length === 0) return PHOTO_URL_REUSE_MS;
  const oldest = Math.min(...photos.map((photo) => photoUrlCache.get(photo.photoId)?.fetchedAt ?? dataUpdatedAt));
  return Math.max(0, oldest + PHOTO_URL_REUSE_MS - dataUpdatedAt);
}

/** Ảnh trước được tải lên khi lịch `Received`, ảnh sau khi `InProgress` (FR-EXE-09). */
const PHOTO_LIVE_STATUSES: readonly AppointmentStatus[] = ["Received", "InProgress"];

type PhotoQueryOptions = QueryToggle & {
  /** Trạng thái lịch hiện tại: lịch đang ở cửa hàng thì tải lại định kỳ để ảnh mới hiện ra (CW-09). */
  liveStatus?: AppointmentStatus;
};

/** GET /appointments/{id}/photos – FR-EXE-09. Ảnh xếp Trước rồi Sau, cùng loại theo thời gian tải lên. */
export function useAppointmentPhotos(appointmentId: string, { enabled = true, liveStatus }: PhotoQueryOptions = {}) {
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
    // URL cũ nhất quá 40 phút thì coi là cũ để lần mở lại màn lấy URL mới trước khi URL hết hạn.
    staleTime: (current) => photoStaleTime(current.state.data, current.state.dataUpdatedAt),
    refetchInterval: liveStatus && PHOTO_LIVE_STATUSES.includes(liveStatus) ? LIVE_DETAIL_REFETCH_MS : false,
  });

  /**
   * Bỏ URL đã nhớ của lịch này rồi tải lại. Nhiều ảnh cùng hết hạn sẽ gọi hàm này gần như cùng lúc:
   * `cancelRefetch: false` để các lần sau dùng chung lần tải đang chạy thay vì hủy và gửi lại request.
   * Lần tải đang chạy vẫn ra URL mới vì bộ nhớ URL chỉ được đọc sau khi có phản hồi.
   */
  function refreshUrls() {
    query.data?.forEach((photo) => photoUrlCache.delete(photo.photoId));
    void queryClient.invalidateQueries(
      { queryKey: appointmentKeys.photos(appointmentId), exact: true },
      { cancelRefetch: false },
    );
  }

  return { ...query, refreshUrls };
}

const PHOTO_KIND_ORDER = { Before: 0, After: 1 } as const;

function sortPhotos(photos: Photo[]) {
  return [...photos].sort(
    (a, b) => PHOTO_KIND_ORDER[a.kind] - PHOTO_KIND_ORDER[b.kind] || Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt),
  );
}
