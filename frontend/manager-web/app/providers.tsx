"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/feedback/toast";
import { makeQueryClient } from "@/lib/query-client";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // Mỗi lần render trên server dùng client riêng; trình duyệt dùng lại một client để giữ cache.
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
