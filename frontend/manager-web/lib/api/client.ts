import axios from "axios";
import { toApiError } from "./errors";

/** Axios dùng chung cho mọi lời gọi backend; baseURL gồm cả tiền tố /api/v1 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Mọi lỗi trả ra ngoài đều là ApiError đã đọc error envelope
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);