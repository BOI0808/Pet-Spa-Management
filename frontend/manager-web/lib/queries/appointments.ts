import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  cancelAppointment,
  confirmHotelAppointment,
  confirmSpaAppointment,
  getAppointment,
  getHotelSuggestions,
  getSpaSuggestions,
  listAppointmentPhotos,
  listAppointments,
  rejectAppointment,
  updateAppointment,
  type AppointmentListParams,
} from "@/lib/api/endpoints/appointments";
import { toApiError } from "@/lib/api/errors";
import type { Appointment, AppointmentDetail, AppointmentStatus, AppointmentType, Photo } from "@/lib/api/types";

// Backend giới hạn `pageSize` tối đa 100 và luôn sắp theo `CreatedAt` tăng dần;
// tạm tải hết các trang `Pending` (tối đa 1.000 lịch) để web sắp theo giờ hẹn gần nhất, đếm đúng và tìm đủ `?appointmentId=`.
export const PENDING_PAGE_SIZE = 100;
const MAX_PENDING_PAGES = 10;

// Danh sách MW-04 và huy hiệu thanh bên dùng chung chu kỳ làm mới 60 giây khi tab đang hiển thị (Frontend-Architecture 5.1).
const PENDING_REFRESH_MS = 60_000;

export type PendingAppointmentsResult = {
  items: Appointment[];
  total: number;
  /** `true` khi tổng số lịch `Pending` vượt quá số dòng tải tối đa trên web. */
  isTruncated: boolean;
};

// Mọi khóa lịch hẹn bắt đầu bằng `all` để sau này một thao tác ghi (xác nhận, từ chối) tải lại cả danh sách lẫn huy hiệu.
export const appointmentKeys = {
  all: ["appointments"] as const,
  pending: () => [...appointmentKeys.all, "pending"] as const,
  pendingCount: () => [...appointmentKeys.all, "pending-count"] as const,
  suggestions: (appointmentId: string) => [...appointmentKeys.all, "suggestions", appointmentId] as const,
  detail: (appointmentId: string) => [...appointmentKeys.all, "detail", appointmentId] as const,
  list: (params: AppointmentListParams) => [...appointmentKeys.all, "list", params] as const,
  photos: (appointmentId: string) => [...appointmentKeys.all, "detail", appointmentId, "photos"] as const,
  count: (params: AppointmentCountParams) => [...appointmentKeys.all, "count", params] as const,
  today: (type: AppointmentType, date: string) => [...appointmentKeys.all, "today", type, date] as const,
};

/** Số dòng mỗi trang của bảng MW-03 (UI-Screens MW-03 vùng 2). */
export const APPOINTMENT_LIST_PAGE_SIZE = 20;

// MW-02 làm mới 60 giây/lần khi tab đang hiển thị (Frontend-Architecture 5.1). Backend giới hạn `pageSize` tối đa 100;
// một ngày của cửa hàng không có nhiều hơn 100 lịch mỗi loại.
const DASHBOARD_REFRESH_MS = 60_000;
const TODAY_PAGE_SIZE = 100;

type AppointmentCountParams = { type?: AppointmentType; status?: AppointmentStatus };

async function fetchAllPendingAppointments(): Promise<PendingAppointmentsResult> {
  const firstPage = await listAppointments({
    status: "Pending",
    page: 1,
    pageSize: PENDING_PAGE_SIZE,
  });

  if (firstPage.total <= firstPage.items.length || firstPage.items.length < PENDING_PAGE_SIZE) {
    return {
      items: firstPage.items,
      total: firstPage.total,
      isTruncated: false,
    };
  }

  const totalPages = Math.ceil(firstPage.total / PENDING_PAGE_SIZE);
  const pagesToFetch = Math.min(totalPages, MAX_PENDING_PAGES);
  const restPages = await Promise.all(
    Array.from({ length: pagesToFetch - 1 }, (_, index) =>
      listAppointments({
        status: "Pending",
        page: index + 2,
        pageSize: PENDING_PAGE_SIZE,
      }),
    ),
  );

  // Khử trùng phòng trường hợp có lịch vừa được xử lý làm dịch ranh giới trang giữa các request.
  const seen = new Set<string>();
  const items: Appointment[] = [];
  for (const page of [firstPage, ...restPages]) {
    for (const item of page.items) {
      if (!seen.has(item.appointmentId)) {
        seen.add(item.appointmentId);
        items.push(item);
      }
    }
  }

  const latestTotal = restPages[restPages.length - 1]?.total ?? firstPage.total;
  return {
    items,
    total: latestTotal,
    isTruncated: totalPages > MAX_PENDING_PAGES,
  };
}

/**
 * Lịch `Pending` của cả spa và lưu trú cho MW-04.
 * Truyền `enabled: false` khi chỉ đọc lại từ cache (ví dụ huy hiệu thanh bên đang đứng ở MW-04).
 */
export function usePendingAppointments({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: appointmentKeys.pending(),
    queryFn: async () => {
      const result = await fetchAllPendingAppointments();
      // Đồng bộ `total` cho query đếm của thanh bên để rời MW-04 không bị lệch hay gọi đếm lại ngay khi dữ liệu còn tươi.
      queryClient.setQueryData(appointmentKeys.pendingCount(), result.total);
      return result;
    },
    enabled,
    refetchInterval: enabled ? PENDING_REFRESH_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** Số lịch `Pending` cho huy hiệu thanh bên: chỉ cần `total` nên xin 1 dòng. */
export function usePendingCount({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: appointmentKeys.pendingCount(),
    queryFn: async () => {
      const page = await listAppointments({ status: "Pending", page: 1, pageSize: 1 });
      return page.total;
    },
    enabled,
    refetchInterval: enabled ? PENDING_REFRESH_MS : false,
    refetchIntervalInBackground: false,
  });
}

/**
 * Chuồng đề xuất cho lịch lưu trú Chờ xác nhận (FR-HTL-05). Chuồng trống thay đổi theo từng lịch được xử lý nên không giữ cache khi rời lịch
 * (`gcTime: 0`): mở lại lịch luôn tải mới, không hiện lại chuồng đề xuất cũ.
 */
export function useHotelSuggestions(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.suggestions(appointmentId),
    queryFn: () => getHotelSuggestions(appointmentId),
    gcTime: 0,
  });
}

/**
 * Nhân viên đề xuất cho lịch spa Chờ xác nhận (FR-ASG-01). Cùng khóa với đề xuất chuồng của lịch lưu trú vì mỗi lịch chỉ thuộc một loại.
 * Nhân viên rảnh thay đổi theo từng lịch được xử lý nên cũng không giữ cache khi rời lịch (`gcTime: 0`).
 */
export function useSpaSuggestions(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.suggestions(appointmentId),
    queryFn: () => getSpaSuggestions(appointmentId),
    gcTime: 0,
  });
}

// Lịch đang ở cửa hàng thay đổi theo tiến độ chăm sóc: chi tiết tải lại 30 giây/lần (Frontend-Architecture 5.1).
const LIVE_DETAIL_REFETCH_MS = 30_000;
const LIVE_STATUSES: readonly AppointmentStatus[] = ["Received", "InProgress"];

type AppointmentDetailOptions = {
  /** `false` cho dòng MW-03 chưa cần nhân viên phụ trách (lịch chờ xác nhận, đã hủy, lưu trú). */
  enabled?: boolean;
  /** Tải lại định kỳ khi lịch đang ở cửa hàng; chỉ bật ở MW-05, danh sách không cần. */
  live?: boolean;
};

/** Chi tiết lịch hẹn (MW-04 dùng `services` của lịch spa để nêu tên dịch vụ và tính tạm tính; MW-05 theo dõi tiến độ). */
export function useAppointmentDetail(appointmentId: string, { enabled = true, live = false }: AppointmentDetailOptions = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: async () => {
      const previous = queryClient.getQueryData<AppointmentDetail>(appointmentKeys.detail(appointmentId));
      const next = await getAppointment(appointmentId);
      // Đổi trạng thái (vd. vừa tiếp nhận) thì ảnh minh chứng có thể vừa phát sinh: tải lại.
      if (previous && previous.status !== next.status) {
        void queryClient.invalidateQueries({ queryKey: appointmentKeys.photos(appointmentId), exact: true });
      }
      return next;
    },
    enabled,
    refetchInterval: (query) =>
      live && query.state.data && LIVE_STATUSES.includes(query.state.data.status) ? LIVE_DETAIL_REFETCH_MS : false,
  });
}

/** Một trang lịch hẹn toàn cửa hàng cho MW-03; giữ trang cũ trên màn hình trong lúc tải trang mới. */
export function useAppointmentList(params: Omit<AppointmentListParams, "pageSize">) {
  const listParams = { ...params, pageSize: APPOINTMENT_LIST_PAGE_SIZE };
  return useQuery({
    queryKey: appointmentKeys.list(listParams),
    queryFn: () => listAppointments(listParams),
    placeholderData: keepPreviousData,
  });
}

export function invalidatePending(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: appointmentKeys.pending() }),
    queryClient.invalidateQueries({ queryKey: appointmentKeys.pendingCount() }),
  ]);
}

/**
 * Sau lỗi 409 tải lại dữ liệu liên quan (Frontend-Conventions 5.1): lịch không còn chờ (INVALID_TRANSITION) thì tải lại danh sách và
 * huy hiệu (đề xuất của lịch đó chắc chắn báo 409 nên không tải); xung đột khác (CAGE_CONFLICT, STAFF_CONFLICT) thì tải lại đề xuất.
 * STAFF_OUT_OF_SHIFT không tải lại: Quản lý đang quyết định có vẫn xác nhận người ngoài ca hay không (MW-04·D2), danh sách không đổi.
 */
function refetchAfterConflict(queryClient: QueryClient, appointmentId: string, error: unknown) {
  const apiError = toApiError(error);
  if (apiError.status !== 409) return;
  if (apiError.code === "STAFF_OUT_OF_SHIFT") return;
  if (apiError.code === "INVALID_TRANSITION") {
    void invalidatePending(queryClient);
  } else {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.suggestions(appointmentId) });
  }
}

/** POST /appointments/{id}/confirm cho lịch lưu trú (FR-HTL-05). Việc tải lại danh sách sau khi thành công do màn hình làm (`useRemovePendingAppointment`). */
export function useConfirmHotelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmHotelAppointment,
    onError: (error, { appointmentId }) => refetchAfterConflict(queryClient, appointmentId, error),
  });
}

/** POST /appointments/{id}/confirm cho lịch spa (FR-ASG-02, FR-ASG-03). Việc tải lại danh sách sau khi thành công do màn hình làm (`useRemovePendingAppointment`). */
export function useConfirmSpaAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmSpaAppointment,
    onError: (error, { appointmentId }) => refetchAfterConflict(queryClient, appointmentId, error),
  });
}

/** POST /appointments/{id}/reject (FR-HTL-06, FR-ASG-04): dùng chung cho lịch lưu trú và lịch spa. */
export function useRejectAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectAppointment,
    onError: (error, appointmentId) => refetchAfterConflict(queryClient, appointmentId, error),
  });
}

/**
 * Trả về hàm gỡ một lịch vừa xác nhận hoặc từ chối khỏi danh sách chờ rồi tải lại danh sách và huy hiệu.
 * Gỡ ngay trong cache để lịch đã xử lý không còn được tự chọn trong lúc chờ tải lại.
 */
export function useRemovePendingAppointment() {
  const queryClient = useQueryClient();
  return (appointmentId: string) => {
    queryClient.setQueryData<PendingAppointmentsResult>(appointmentKeys.pending(), (current) =>
      current && {
        ...current,
        items: current.items.filter((item) => item.appointmentId !== appointmentId),
        total: Math.max(current.total - 1, 0),
      },
    );
    void invalidatePending(queryClient);
  };
}

/**
 * Sau khi đổi hoặc hủy lịch (kể cả khi bị 409) tải lại mọi dữ liệu lịch hẹn đang hiển thị: chi tiết, danh sách chờ, huy hiệu, đề xuất.
 * Các khóa đều bắt đầu bằng `appointmentKeys.all`, và chỉ query đang được dùng mới tải lại ngay.
 */
function invalidateAppointments(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
}

/** POST /appointments/{id}/cancel (FR-CHG-03). Lỗi 409 (vd. INVALID_TRANSITION khi lịch đã Hoàn tất) tải lại để thấy trạng thái mới nhất. */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      void invalidateAppointments(queryClient);
    },
    onError: (error) => {
      if (toApiError(error).status === 409) void invalidateAppointments(queryClient);
    },
  });
}

/** PUT /appointments/{id} (FR-CHG-03). Lỗi 409 (hết chỗ, trùng nhân viên, lịch đã đổi trạng thái…) tải lại để thấy dữ liệu mới nhất. */
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAppointment,
    onSuccess: () => {
      void invalidateAppointments(queryClient);
    },
    onError: (error) => {
      if (toApiError(error).status === 409) void invalidateAppointments(queryClient);
    },
  });
}

// URL ảnh do backend ký có hạn 1 giờ. Tải lại danh sách ảnh sẽ ra URL mới làm trình duyệt tải lại ảnh, nên nhớ URL cũ
// và dùng lại tối đa 40 phút; ảnh không hiển thị được (URL hết hạn) thì gọi `refreshUrls` để lấy URL mới.
const PHOTO_URL_REUSE_MS = 40 * 60_000;
const photoUrlCache = new Map<string, { url: string; fetchedAt: number }>();

/** Bỏ các URL đã quá thời gian dùng lại để bộ nhớ không lớn dần khi Quản lý xem nhiều lịch. */
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

const PHOTO_KIND_ORDER = { Before: 0, After: 1 } as const;

function sortPhotos(photos: Photo[]) {
  return [...photos].sort(
    (a, b) => PHOTO_KIND_ORDER[a.kind] - PHOTO_KIND_ORDER[b.kind] || Date.parse(a.uploadedAt) - Date.parse(b.uploadedAt),
  );
}

type AppointmentPhotosOptions = {
  enabled?: boolean;
  /** Trạng thái lịch hiện tại: lịch đang ở cửa hàng thì tải lại định kỳ để ảnh mới hiện ra (FR-EXE-08, FR-EXE-09). */
  liveStatus?: AppointmentStatus;
};

/** GET /appointments/{id}/photos – FR-EXE-09. Ảnh xếp Trước rồi Sau, cùng loại theo thời gian tải lên. */
export function useAppointmentPhotos(appointmentId: string, { enabled = true, liveStatus }: AppointmentPhotosOptions = {}) {
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
    refetchInterval: liveStatus && LIVE_STATUSES.includes(liveStatus) ? LIVE_DETAIL_REFETCH_MS : false,
  });

  /**
   * Bỏ URL đã nhớ của lịch này rồi tải lại. Nhiều ảnh cùng hết hạn sẽ gọi hàm này gần như cùng lúc:
   * `cancelRefetch: false` để các lần sau dùng chung lần tải đang chạy thay vì hủy và gửi lại request.
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

/** Số lịch theo loại và trạng thái (chỉ cần `total` nên xin 1 dòng) cho thẻ số liệu MW-02. */
export function useAppointmentCount(params: AppointmentCountParams) {
  return useQuery({
    queryKey: appointmentKeys.count(params),
    queryFn: async () => (await listAppointments({ ...params, page: 1, pageSize: 1 })).total,
    refetchInterval: DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

/**
 * Lịch của một loại trong ngày `date` (“YYYY-MM-DD”, múi giờ cửa hàng) cho MW-02, giờ hẹn tăng dần.
 * Lịch lưu trú gồm cả lịch có ngày nhận hoặc ngày trả trong ngày đó.
 */
export function useTodayAppointments(type: AppointmentType, date: string) {
  return useQuery({
    queryKey: appointmentKeys.today(type, date),
    queryFn: () => listAppointments({ type, date, page: 1, pageSize: TODAY_PAGE_SIZE }),
    refetchInterval: DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

/**
 * Chi tiết nhiều lịch cùng lúc để biết nhân viên phụ trách (UI-Screens G-05: danh sách chưa trả tên nhân viên; chỉ gọi cho lịch trong ngày).
 * Dùng chung khóa cache với `useAppointmentDetail`.
 */
export function useAppointmentDetails(appointmentIds: readonly string[]) {
  return useQueries({
    queries: appointmentIds.map((appointmentId) => ({
      queryKey: appointmentKeys.detail(appointmentId),
      queryFn: () => getAppointment(appointmentId),
      refetchInterval: DASHBOARD_REFRESH_MS,
      refetchIntervalInBackground: false,
    })),
  });
}
