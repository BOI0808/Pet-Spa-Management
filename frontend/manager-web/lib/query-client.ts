import { QueryClient } from "@tanstack/react-query";
import { toApiError } from "@/lib/api/errors";

const DEFAULT_QUERY_RETRY = 3;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Lỗi 4xx (dữ liệu sai, không có quyền, xung đột nghiệp vụ…) gọi lại vẫn lỗi nên không thử lại;
        // mất mạng và 5xx giữ số lần thử lại mặc định của TanStack Query.
        retry: (failureCount, error) => {
          const { status } = toApiError(error);
          if (status !== null && status >= 400 && status < 500) return false;
          return failureCount < DEFAULT_QUERY_RETRY;
        },
      },
    },
  });
}