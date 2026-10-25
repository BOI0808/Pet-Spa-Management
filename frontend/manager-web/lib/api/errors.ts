import { isAxiosError } from "axios";

/** Mã lỗi nghiệp vụ backend trả về – System Analysis mục 5.1.2. */
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "BOOKING_LOCKED",
  "NOT_FOUND",
  "DUPLICATE_CONTACT",
  "SLOT_FULL",
  "NO_CAPACITY",
  "STAFF_CONFLICT",
  "CAGE_CONFLICT",
  "INVALID_TRANSITION",
  "CHANGE_WINDOW_CLOSED",
  "PHOTO_REQUIRED",
  "SERVICES_INCOMPLETE",
  "STAFF_COUNT_MISMATCH",
  "SHIFT_OVERLAP",
  "SHIFT_HAS_APPOINTMENTS",
  "COST_CONFIRMATION_PENDING",
  "PAYMENT_NOT_DUE",
  "AMOUNT_MISMATCH",
  // Bốn mã SA 5.1.2 ghi "Đề xuất"; customer-web chưa có.
  "STAFF_OUT_OF_SHIFT",
  "CUSTOMER_NOT_LOCKED",
  "DUPLICATE_CAGE_CODE",
  "COST_CONFIRMATION_EXPIRED",
  "RATE_LIMITED",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Error envelope: ProblemDetails kèm code nghiệp vụ (mục 5.1.1), ví dụ
 * `{ "status": 409, "code": "SLOT_FULL", "title": "Khung giờ đã kín", "detail": "Vui lòng chọn khung giờ khác." }`.
 * Chỉ đọc 4 trường này; lỗi theo từng trường của VALIDATION_ERROR chưa được chốt nên chưa xử lý.
 */
export type ErrorEnvelope = {
  status: number;
  code?: string;
  title: string;
  detail?: string;
};

export function isErrorEnvelope(data: unknown): data is ErrorEnvelope {
  if (typeof data !== "object" || data === null) return false;
  const value = data as Record<string, unknown>;
  return (
    typeof value.status === "number" &&
    typeof value.title === "string" &&
    (value.code === undefined || typeof value.code === "string") &&
    (value.detail === undefined || typeof value.detail === "string")
  );
}

/**
 * - `http`: backend đã trả về mã HTTP lỗi (có hoặc không có envelope).
 * - `network`: không nhận được phản hồi (mất mạng, sai địa chỉ, CORS, hết thời gian chờ).
 * - `unknown`: lỗi không đến từ lời gọi API.
 */
export type ApiErrorKind = "http" | "network" | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly title: string | null;
  readonly detail: string | null;

  constructor(init: {
    kind: ApiErrorKind;
    status?: number | null;
    code?: string | null;
    title?: string | null;
    detail?: string | null;
    cause?: unknown;
  }) {
    super(init.detail ?? init.title ?? `ApiError (${init.kind})`, { cause: init.cause });
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.code = init.code ?? null;
    this.title = init.title ?? null;
    this.detail = init.detail ?? null;
  }
}

/** Chuẩn hóa mọi lỗi (thường là lỗi Axios) về ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    if (!error.response) return new ApiError({ kind: "network", cause: error });

    const { status, data } = error.response;
    if (isErrorEnvelope(data)) {
      return new ApiError({
        kind: "http",
        status,
        code: data.code,
        title: data.title,
        detail: data.detail,
        cause: error,
      });
    }
    return new ApiError({ kind: "http", status, cause: error });
  }

  return new ApiError({ kind: "unknown", cause: error });
}

// Câu thông báo chung đã được nhóm duyệt; 403 và 429 lấy đúng câu trong ui-demo.
export const ERROR_MESSAGES = {
  network: "Không kết nối được máy chủ, vui lòng thử lại.",
  server: "Có lỗi xảy ra, vui lòng thử lại sau.",
  rateLimited: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.",
  forbiddenTitle: "Bạn không có quyền xem trang này",
  forbiddenDetail: "Lỗi 403. Trang nằm ngoài phạm vi vai trò của bạn.",
} as const;

/** 403 do sai vai trò / ngoài phạm vi (FORBIDDEN); BOOKING_LOCKED cũng là 403 nhưng là lỗi nghiệp vụ. */
export function isForbiddenError(error: unknown) {
  const apiError = toApiError(error);
  return apiError.status === 403 && (apiError.code === null || apiError.code === "FORBIDDEN");
}

export function isRateLimitedError(error: unknown) {
  return toApiError(error).status === 429;
}

/**
 * Câu hiển thị cho người dùng theo mục 6.6:
 * mất mạng / 5xx → câu chung (không lộ chi tiết nội bộ); 429 → nhắc thử lại sau;
 * 403 FORBIDDEN → không có quyền; còn lại → `detail`, thiếu thì `title` của envelope.
 */
export function getErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.kind === "network") return ERROR_MESSAGES.network;
  if (apiError.kind === "unknown" || apiError.status === null || apiError.status >= 500) {
    return ERROR_MESSAGES.server;
  }
  if (isRateLimitedError(apiError)) return ERROR_MESSAGES.rateLimited;
  if (isForbiddenError(apiError)) return ERROR_MESSAGES.forbiddenTitle;

  return apiError.detail ?? apiError.title ?? ERROR_MESSAGES.server;
}
