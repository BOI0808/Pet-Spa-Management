import { setAccessTokenProvider, setTokenRefresher } from "@/lib/api/client";
import { refreshSession } from "@/lib/api/endpoints/session";
import { toApiError } from "@/lib/api/errors";
import type { LoginReason } from "./login-url";

// Access token chỉ nằm trong bộ nhớ của tab: tải lại trang là mất, khi đó đổi lại từ cookie refresh token (FA 6.1).
let accessToken: string | null = null;
let refreshing: Promise<string> | null = null;
let sessionEndedListener: ((reason: LoginReason) => void) | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

/** Đăng ký hàm được gọi khi phiên kết thúc ngoài ý muốn (hết hạn, sai web). Trả về hàm hủy đăng ký. */
export function onSessionEnded(listener: (reason: LoginReason) => void) {
  sessionEndedListener = listener;
  return () => {
    if (sessionEndedListener === listener) sessionEndedListener = null;
  };
}

export function notifySessionEnded(reason: LoginReason) {
  accessToken = null;
  sessionEndedListener?.(reason);
}

const REFRESH_LOCK_NAME = "ps-refresh-session";

// Cookie refresh token dùng chung cho mọi tab của web này. Hai tab gửi cùng một refresh token thì backend coi bên chậm là
// dùng lại token và thu hồi mọi phiên của tài khoản. Khóa này xếp các lần làm mới của mọi tab vào hàng: tab đến sau
// sẽ gửi cookie mới mà tab trước vừa đặt.
async function runExclusively<T>(task: () => Promise<T>): Promise<T> {
  // navigator.locks chỉ có ở ngữ cảnh an toàn (https hoặc localhost); không có thì làm mới như cũ.
  if (typeof navigator === "undefined" || !("locks" in navigator)) return task();
  // `await`: navigator.locks.request trả Promise<Promise<T>> ở lib.dom của TS 5.9; chờ xong để lấy đúng T.
  return await navigator.locks.request(REFRESH_LOCK_NAME, task);
}

/**
 * Đổi cookie refresh token lấy access token mới.
 * Refresh token xoay vòng và dùng lại token cũ sẽ bị thu hồi cả chuỗi, nên các lời gọi
 * đồng thời phải dùng chung một lần làm mới.
 */
export function refreshAccessToken() {
  refreshing ??= runExclusively(() => refreshSession())
    .then(({ accessToken: token }) => {
      accessToken = token;
      return token;
    })
    .catch((error: unknown) => {
      // Chỉ 401 mới là hết phiên; mất mạng hay 5xx thì giữ nguyên để người dùng thử lại.
      if (toApiError(error).status === 401) notifySessionEnded("expired");
      throw error;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

setAccessTokenProvider(getAccessToken);
setTokenRefresher(refreshAccessToken);
