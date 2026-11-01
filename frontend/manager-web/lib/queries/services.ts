import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createService, listServices, setServiceStatus, updateService } from "@/lib/api/endpoints/services";

export const serviceKeys = {
  all: ["services"] as const,
};

export function useServices() {
  return useQuery({ queryKey: serviceKeys.all, queryFn: listServices });
}

// Sau mỗi thao tác ghi tải lại danh sách (Frontend-Architecture 5.1).
function useInvalidateServices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: serviceKeys.all });
}

export function useCreateService() {
  const invalidate = useInvalidateServices();
  return useMutation({ mutationFn: createService, onSuccess: invalidate });
}

export function useUpdateService() {
  const invalidate = useInvalidateServices();
  return useMutation({ mutationFn: updateService, onSuccess: invalidate });
}

export function useSetServiceStatus() {
  const invalidate = useInvalidateServices();
  return useMutation({ mutationFn: setServiceStatus, onSuccess: invalidate });
}
