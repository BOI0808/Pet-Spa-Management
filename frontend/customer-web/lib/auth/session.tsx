"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/feedback/toast";
import { loginSession, logoutSession } from "@/lib/api/endpoints/session";
import type { Me } from "@/lib/api/types";
import { meKeys, useMe } from "@/lib/queries/me";
import { endSession, setSessionExpiredHandler, startSession } from "./access-token";
import { SESSION_MESSAGES } from "./session-config";

export const sessionKeys = {
  /** true khi đã có access token trong bộ nhớ (SessionGate). */
  ready: ["session", "ready"] as const,
};

/** Lý do phiên kết thúc trong tab này; SessionGate dựa vào đây để về màn đăng nhập. */
export type SessionEndReason = "logout" | "expired";

type SessionValue = {
  /** Kết quả GET /me; null khi chưa tải xong hoặc chưa đăng nhập. */
  me: Me | null;
  endReason: SessionEndReason | null;
  /** Lưu phiên sau khi POST /api/session/login thành công. */
  begin: (accessToken: string, me: Me) => void;
  /** Thu hồi refresh token, xóa access token và bộ đệm TanStack Query (User-Flows 4.2). */
  logout: (options?: { message?: string }) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const { data: me } = useMe({ enabled: false });
  const [endReason, setEndReason] = useState<SessionEndReason | null>(null);

  // Làm mới token thất bại (401): xóa dữ liệu của phiên cũ, báo hết phiên; SessionGate chuyển về đăng nhập kèm ?next=.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      showError(SESSION_MESSAGES.expired);
      setEndReason("expired");
    });
    return () => setSessionExpiredHandler(() => {});
  }, [queryClient, showError]);

  // Không clear() ở đây: bộ đệm đã được xóa khi đăng xuất/hết phiên, và clear() khi không render lại
  // làm các useQuery đang mở (thanh trên, SessionProvider) mất liên kết với dữ liệu mới.
  const begin = useCallback(
    (accessToken: string, nextMe: Me) => {
      startSession(accessToken);
      queryClient.setQueryData(meKeys.detail, nextMe);
      queryClient.setQueryData(sessionKeys.ready, true);
      setEndReason(null);
    },
    [queryClient],
  );

  const logout = useCallback(
    async ({ message }: { message?: string } = {}) => {
      try {
        await logoutSession();
      } catch (error) {
        // Không tới được route handler thì cookie còn nguyên: báo lỗi, giữ phiên.
        showError(error);
        return;
      }
      endSession();
      queryClient.clear();
      if (message) showError(message);
      setEndReason("logout");
    },
    [queryClient, showError],
  );

  const value = useMemo<SessionValue>(
    () => ({ me: me ?? null, endReason, begin, logout }),
    [me, endReason, begin, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession phải dùng bên trong <SessionProvider>.");
  return context;
}

/** CW-02: gọi POST /api/session/login, thành công thì lưu phiên. */
export function useLogin() {
  const { begin } = useSession();
  return useMutation({
    mutationFn: loginSession,
    onSuccess: ({ accessToken, me }) => begin(accessToken, me),
  });
}
