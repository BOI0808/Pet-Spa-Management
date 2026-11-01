import axios, { isAxiosError } from "axios";
import { toApiError } from "./errors";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Lời gọi này đã được gửi lại một lần sau khi làm mới token (xem interceptor phản hồi bên dưới). */
    _retried?: boolean;
  }
}

type AccessTokenProvider = () => string | null;
type TokenRefresher = () => Promise<string | null>;

let getAccessToken: AccessTokenProvider = () => null;
let refreshAccessToken: TokenRefresher = async () => null;

/** `lib/auth/session.ts` gọi hàm này để client tự gắn `Authorization: Bearer <accessToken>`. */
export function setAccessTokenProvider(provider: AccessTokenProvider) {
  getAccessToken = provider;
}

/** `lib/auth/session.ts` gọi hàm này để client tự làm mới access token khi gặp 401. */
export function setTokenRefresher(refresher: TokenRefresher) {
  refreshAccessToken = refresher;
}

/** Axios dùng chung cho mọi lời gọi backend; baseURL gồm cả tiền tố /api/v1 (mục 5.1.1). */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Route handler phiên tự lo token của mình nên 401 của chúng không đi qua bước làm mới (FA 6.3).
const SESSION_PATH_PREFIX = "/api/session/";

// 401 do access token hết hạn: làm mới một lần rồi gửi lại lời gọi.
// Mọi lỗi trả ra ngoài đều là ApiError đã đọc error envelope.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !error.config._retried &&
      !error.config.url?.startsWith(SESSION_PATH_PREFIX)
    ) {
      let isRefreshed = false;
      try {
        isRefreshed = (await refreshAccessToken()) !== null;
      } catch {
        // Làm mới thất bại: trả lỗi 401 gốc ra ngoài; việc về màn đăng nhập do `onSessionEnded` (lib/auth/session.ts) lo.
      }
      if (isRefreshed) return apiClient({ ...error.config, _retried: true });
    }
    throw toApiError(error);
  },
);
