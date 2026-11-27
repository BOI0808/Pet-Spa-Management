import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createCage, listCages, setCageStatus, updateCage } from "@/lib/api/endpoints/cages";

export const cageKeys = {
  all: ["cages"] as const,
};

export type CageQueryOptions = {
  /** `false` khi chưa cần danh sách chuồng (vd. hộp thoại chỉ cần chuồng với lịch đã xác nhận). */
  enabled?: boolean;
};

/** GET /cages (FR-HTL-08): toàn bộ chuồng kèm thú cưng đang chứa. */
export function useCages(options?: CageQueryOptions) {
  return useQuery({ queryKey: cageKeys.all, queryFn: listCages, enabled: options?.enabled });
}

/** Tải lại danh sách chuồng; gọi sau khi một thao tác làm đổi chuồng hoặc thú cưng đang chứa (nhận, trả thú cưng). */
export function invalidateCages(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: cageKeys.all });
}

// Sau mỗi thao tác ghi tải lại danh sách (Frontend-Architecture 5.1). Trả về Promise để hộp thoại chỉ đóng sau khi danh sách đã mới.
function useCageMutationOptions() {
  const queryClient = useQueryClient();
  return { onSuccess: () => invalidateCages(queryClient) };
}

export function useCreateCage() {
  return useMutation({ mutationFn: createCage, ...useCageMutationOptions() });
}

export function useUpdateCage() {
  return useMutation({ mutationFn: updateCage, ...useCageMutationOptions() });
}

export function useSetCageStatus() {
  return useMutation({ mutationFn: setCageStatus, ...useCageMutationOptions() });
}
