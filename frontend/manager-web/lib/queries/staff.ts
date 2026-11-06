import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStaff, deactivateStaff, listStaff, updateStaff } from "@/lib/api/endpoints/staff";
import type { ApiError } from "@/lib/api/errors";

export const staffKeys = {
  all: ["staff"] as const,
};

export function useStaff() {
  return useQuery({ queryKey: staffKeys.all, queryFn: listStaff });
}

// Sau mỗi thao tác ghi tải lại danh sách (Frontend-Architecture 5.1); lỗi 409 (vd. trùng số điện thoại,
// dữ liệu đã đổi) cũng tải lại để thấy dữ liệu mới nhất.
function useStaffMutationOptions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: staffKeys.all });
  return {
    onSuccess: invalidate,
    onError: (error: ApiError) => {
      if (error.status === 409) return invalidate();
    },
  };
}

export function useCreateStaff() {
  return useMutation({ mutationFn: createStaff, ...useStaffMutationOptions() });
}

export function useUpdateStaff() {
  return useMutation({ mutationFn: updateStaff, ...useStaffMutationOptions() });
}

export function useDeactivateStaff() {
  return useMutation({ mutationFn: deactivateStaff, ...useStaffMutationOptions() });
}
