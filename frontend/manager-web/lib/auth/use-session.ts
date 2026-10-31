"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useToast } from "@/components/feedback/toast";
import { getMe } from "@/lib/api/endpoints/me";
import { logoutSession } from "@/lib/api/endpoints/session";
import { ApiError } from "@/lib/api/errors";
import { ALLOWED_ROLE } from "./config";
import { buildLoginUrl, type LoginReason } from "./login-url";
import { clearAccessToken, getAccessToken, notifySessionEnded, refreshAccessToken } from "./session";

export const meKeys = { all: ["me"] as const };

// Mở web (hoặc tải lại trang) thì chưa có access token trong bộ nhớ: đổi từ cookie refresh token rồi mới gọi GET /me.
async function loadMe() {
  if (!getAccessToken()) await refreshAccessToken();

  const me = await getMe();
  if (me.role !== ALLOWED_ROLE) {
    // Cookie của tài khoản khác vai trò (vd. đăng nhập ở web khác trên cùng localhost): thu hồi phiên và báo sai web (BR-05).
    await logoutSession();
    notifySessionEnded("wrong-web");
    throw new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" });
  }
  return me;
}

/** Phiên đăng nhập hiện tại: kết quả GET /me, đăng xuất và rời khỏi phiên. */
export function useSession() {
  const router = useRouter();
  const toast = useToast();
  const meQuery = useQuery({ queryKey: meKeys.all, queryFn: loadMe, staleTime: Infinity });

  /** Bỏ token trong bộ nhớ rồi về màn đăng nhập (User-Flows 4.2). Bộ đệm dữ liệu được xóa khi LoginScreen hiện ra. */
  const leave = useCallback(
    (options?: { reason?: LoginReason; next?: string }) => {
      // Không xóa bộ đệm ở đây: router.replace chưa gỡ xong Sidebar và SessionGate, xóa `me` lúc này làm chúng tải lại
      // ngay (refresh 401 rồi báo "hết hạn" sai).
      clearAccessToken();
      router.replace(buildLoginUrl(options));
    },
    [router],
  );

  const logoutMutation = useMutation({
    mutationFn: logoutSession,
    onSuccess: () => leave(),
    onError: (error) => toast.showError(error),
  });

  return {
    me: meQuery.data,
    error: meQuery.error,
    retry: () => void meQuery.refetch(),
    logout: () => logoutMutation.mutate(),
    leave,
  };
}
