import { isAxiosError } from "axios";

type ErrorEnvelope = {
  status: number;
  code?: string;
  title: string;
  detail?: string;
};

function isErrorEnvelope(data: unknown): data is ErrorEnvelope {
  if (typeof data !== "object" || data === null) return false;
  const value = data as Record<string, unknown>;
  return (
    typeof value.status === "number" &&
    typeof value.title === "string" &&
    (value.code === undefined || typeof value.code === "string") &&
    (value.detail === undefined || typeof value.detail === "string")
  );
}

type ApiErrorKind = "http" | "network" | "unknown";

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

//Hai câu thông báo chung dùng thống nhất với web khách hàng
const ERROR_MESSAGES = {
  network: "Không kết nối được máy chủ, vui lòng thử lại.",
  server: "Có lỗi xảy ra, vui lòng thử lại sau.",
} as const;

export function getErrorMessage(error: unknown): string {
  const apiError = toApiError(error);

  if (apiError.kind === "network") return ERROR_MESSAGES.network;
  if (apiError.kind === "unknown" || apiError.status === null || apiError.status >= 500) {
    return ERROR_MESSAGES.server;
  }

  return apiError.detail ?? apiError.title ?? ERROR_MESSAGES.server;
}