import axios, { isAxiosError } from "axios";
import { toApiError } from "./errors";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Không làm mới token khi gặp 401: đăng ký, đăng nhập và route handler phiên (`app/api/session/*`). */
    skipAuthRefresh?: boolean;
    /** Đã gửi lại một lần sau khi làm mới token, gặp 401 nữa thì trả lỗi. */
    authRetried?: boolean;
  }
}

type AccessTokenProvider = () => string | null;
type AccessTokenRefresher = () => Promise<string | null>;

let getAccessToken: AccessTokenProvider = () => null;
let refreshAccessToken: AccessTokenRefresher = async () => null;

/** Phiên đăng nhập (`lib/auth`) gọi hàm này để client tự gắn `Authorization: Bearer <accessToken>`. */
export function setAccessTokenProvider(provider: AccessTokenProvider) {
  getAccessToken = provider;
}

/** Hàm lấy access token mới khi backend trả 401 (Frontend-Architecture 6.3); trả null khi phiên đã hết. */
export function setAccessTokenRefresher(refresher: AccessTokenRefresher) {
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

// Access token hết hạn (401): làm mới một lần rồi gửi lại request cũ một lần.
// Mọi lỗi trả ra ngoài đều là ApiError đã đọc error envelope.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      !error.config.skipAuthRefresh &&
      !error.config.authRetried
    ) {
      const token = await refreshAccessToken();
      if (token) return apiClient.request({ ...error.config, authRetried: true });
    }
    return Promise.reject(toApiError(error));
  },
);
