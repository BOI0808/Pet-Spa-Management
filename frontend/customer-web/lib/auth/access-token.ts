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
// Tăng mỗi lần đăng nhập/đăng xuất/hết phiên; lần làm mới bắt đầu ở thế hệ cũ thì bỏ kết quả.
let generation = 0;

export function getAccessToken() {
  return accessToken;
}

/** Đăng nhập thành công. */
export function startSession(token: string) {
  generation += 1;
  accessToken = token;
  sessionEnded = false;
}

/** Đăng xuất hoặc hết phiên. */
export function endSession() {
  generation += 1;
  accessToken = null;
  sessionEnded = true;
}

/** SessionProvider đăng ký việc cần làm khi phiên hết hạn: xóa bộ đệm, báo và về màn đăng nhập. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

// Refresh token xoay vòng: gửi lại token cũ bị backend coi là dùng lại và thu hồi mọi phiên của tài khoản.
// Vì vậy mọi thao tác ghi cookie phiên (làm mới, đăng nhập, đăng xuất) chạy lần lượt: trong một tab qua
// pendingRefresh, giữa các tab qua Web Locks, để thao tác sau luôn đọc cookie mà thao tác trước vừa ghi.
async function withSessionLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return navigator.locks.request("ps.session", task);
  }
  return task();
}

async function requestAccessToken(startedIn: number): Promise<string | null> {
  // Đăng xuất/đăng nhập xen vào lúc chờ khóa: lần làm mới này thuộc phiên cũ, không gửi nữa.
  if (startedIn !== generation) return null;
  try {
    const { accessToken: token } = await refreshSession();
    if (startedIn !== generation) return null;
    accessToken = token;
    return token;
  } catch (error) {
    if (startedIn !== generation) return null;
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
  if (!pendingRefresh) {
    const startedIn = generation;
    pendingRefresh = withSessionLock(() => requestAccessToken(startedIn)).finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

/** Dùng access token đang có, chưa có (vừa tải lại trang) thì làm mới. */
export async function ensureAccessToken() {
  return accessToken ?? refreshAccessToken();
}

/**
 * Chạy đăng nhập/đăng xuất sau lần làm mới đang dở và giữ khóa phiên đến khi xong, để route handler đọc
 * refresh token mới nhất và phản hồi làm mới tới muộn không ghi lại cookie sau khi đã đăng xuất.
 */
export async function runSessionChange<T>(task: () => Promise<T>): Promise<T> {
  await pendingRefresh?.catch(() => null);
  return withSessionLock(task);
}

setAccessTokenProvider(getAccessToken);
setAccessTokenRefresher(refreshAccessToken);
