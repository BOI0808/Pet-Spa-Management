import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWalkInCustomer, listCustomers, type CustomerSearchParams } from "@/lib/api/endpoints/customers";

export const customerKeys = {
  all: ["customers"] as const,
  search: (params: CustomerSearchParams) => ["customers", "search", params] as const,
};

/** Chỉ gọi khi đã có từ khóa: ô tìm trống thì không tải danh sách cả cửa hàng. */
export function useCustomerSearch(params: CustomerSearchParams) {
  return useQuery({
    queryKey: customerKeys.search(params),
    queryFn: () => listCustomers(params),
    enabled: params.search !== "",
  });
}

export function useCreateWalkInCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWalkInCustomer,
    // Lần tìm lại số này phải thấy khách vừa ghi nhận.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}
