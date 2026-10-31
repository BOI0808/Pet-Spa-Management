import { apiClient } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

export async function getMe() {
  const { data } = await apiClient.get<Me>("/me");
  return data;
}
