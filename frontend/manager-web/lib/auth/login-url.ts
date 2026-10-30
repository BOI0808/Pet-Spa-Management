import { ROUTES } from "@/lib/routes";

/** Lý do quay về màn đăng nhập, hiện thành thông báo ở MW-01. */
export type LoginReason = "expired" | "wrong-web";

// Gốc giả chỉ để phân tích đường dẫn tương đối; không bao giờ dùng để tạo đường dẫn trả về.
const PARSE_ORIGIN = "http://next.invalid";

// Ký tự điều khiển (C0, DEL, C1) và dấu gạch chéo ngược. Bộ phân tích URL của trình duyệt/Node
// âm thầm bỏ \t \n \r ở mọi vị trí, nên "/\n/host" thành "//host" (chuyển hướng ra ngoài web).
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f\\]/;

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isLoginPath(pathname: string) {
  return safeDecode(pathname).replace(/\/+$/, "") === ROUTES.login;
}

/** `next` chỉ nhận đường dẫn nội bộ (User-Flows 4.1); không nhận chính màn đăng nhập để tránh vòng lặp chuyển hướng. */
export function getSafeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || UNSAFE_CHARS.test(next)) return null;

  let url: URL;
  try {
    url = new URL(next, PARSE_ORIGIN);
  } catch {
    return null;
  }
  // Sau khi phân tích đúng như trình duyệt/proxy sẽ làm, đích vẫn phải thuộc chính web này.
  if (url.origin !== PARSE_ORIGIN || url.pathname.startsWith("//")) return null;
  if (isLoginPath(url.pathname)) return null;

  return next; // trả về chuỗi gốc đã kiểm tra, không trả chuỗi đã chuẩn hóa
}

export function buildLoginUrl({ next, reason }: { next?: string | null; reason?: LoginReason } = {}) {
  const params = new URLSearchParams();
  const safeNext = getSafeNext(next);
  if (safeNext && safeNext !== ROUTES.dashboard) params.set("next", safeNext);
  if (reason) params.set("reason", reason);

  const query = params.toString();
  return query ? `${ROUTES.login}?${query}` : ROUTES.login;
}
