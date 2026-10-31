import { setAccessTokenProvider, setAccessTokenRefresher } from "@/lib/api/client";
import { refreshSession } from "@/lib/api/endpoints/session";
import { toApiError } from "@/lib/api/errors";

// Access token chỉ nằm trong bộ nhớ (Frontend-Architecture 6.1): mất khi tải lại trang và được lấy lại
// bằng refresh token trong cookie httpOnly qua POST /api/session/refresh.
let accessToken: string | null = null;
let pendingRefresh: Promise<string | null> | null = null;
let onSessionExpired: () => void = () => {};
// Sau khi đăng xuất hoặc hết phiên: request còn dở gặp 401 thì trả lỗi luôn, không gọi làm mới nữa.
let sessionEnded = false;

export function getAccessToken() {
  return accessToken;
}

/** Đăng nhập thành công. */
export function startSession(token: string) {
  accessToken = token;
  sessionEnded = false;
}

/** Đăng xuất hoặc hết phiên. */
export function endSession() {
  accessToken = null;
  sessionEnded = true;
}

/** SessionProvider đăng ký việc cần làm khi phiên hết hạn: xóa bộ đệm, báo và về màn đăng nhập. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// Refresh token xoay vòng: gửi lại token cũ bị backend coi là dùng lại và thu hồi mọi phiên của tài khoản.
// Vì vậy trong một tab chỉ có một lần làm mới tại một thời điểm, và các tab xếp hàng bằng Web Locks
// để tab sau gửi cookie mới mà tab trước vừa nhận.
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return navigator.locks.request("ps.refresh", task);
  }
  return task();
}

async function requestAccessToken(): Promise<string | null> {
  try {
    const { accessToken: token } = await refreshSession();
    accessToken = token;
    return token;
  } catch (error) {
    // Mất mạng, 5xx, 429: phiên có thể vẫn còn, ném lỗi để màn hình cho thử lại.
    if (toApiError(error).status !== 401) throw error;
    endSession();
    onSessionExpired();
    return null;
  }
}

/** Lấy access token mới; mọi lời gọi cùng lúc dùng chung một lần làm mới. Trả null khi phiên đã hết. */
export function refreshAccessToken(): Promise<string | null> {
  if (sessionEnded) return Promise.resolve(null);
  pendingRefresh ??= withRefreshLock(requestAccessToken).finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/** Dùng access token đang có, chưa có (vừa tải lại trang) thì làm mới. */
export async function ensureAccessToken() {
  return accessToken ?? refreshAccessToken();
}

setAccessTokenProvider(getAccessToken);
setAccessTokenRefresher(refreshAccessToken);
