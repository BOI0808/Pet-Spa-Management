import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, updateMe } from "@/lib/api/endpoints/me";

export const meKeys = {
  detail: ["me"] as const,
};

/** `enabled: false` chỉ đọc kết quả đã có (SessionGate là nơi tải GET /me). */
export function useMe({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: meKeys.detail, queryFn: getMe, enabled });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    // Tải lại GET /me để tên trên thanh trên cập nhật (UI-Screens CW-13).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKeys.detail }),
  });
}
