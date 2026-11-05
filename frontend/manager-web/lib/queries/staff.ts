import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStaff, deactivateStaff, listStaff, updateStaff } from "@/lib/api/endpoints/staff";

export const staffKeys = {
  all: ["staff"] as const,
};

export function useStaff() {
  return useQuery({ queryKey: staffKeys.all, queryFn: listStaff });
}

// Sau mỗi thao tác ghi tải lại danh sách (Frontend-Architecture 5.1).
function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: staffKeys.all });
}

export function useCreateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: createStaff, onSuccess: invalidate });
}

export function useUpdateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: updateStaff, onSuccess: invalidate });
}

export function useDeactivateStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({ mutationFn: deactivateStaff, onSuccess: invalidate });
}
