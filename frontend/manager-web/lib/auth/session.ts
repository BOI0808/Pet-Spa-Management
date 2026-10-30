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

/**
 * Đổi cookie refresh token lấy access token mới.
 * Refresh token xoay vòng và dùng lại token cũ sẽ bị thu hồi cả chuỗi, nên các lời gọi
 * đồng thời phải dùng chung một lần làm mới.
 */
export function refreshAccessToken() {
  refreshing ??= refreshSession()
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
