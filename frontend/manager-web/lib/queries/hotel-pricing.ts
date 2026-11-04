import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHotelPricing, updateHotelPricing } from "@/lib/api/endpoints/hotel-pricing";
import type { HotelPricing } from "@/lib/api/types";

export const hotelPricingKeys = {
  all: ["hotel-pricing"] as const,
  update: ["hotel-pricing", "update"] as const,
};

export function useHotelPricing() {
  return useQuery({ queryKey: hotelPricingKeys.all, queryFn: getHotelPricing });
}

// Sau mỗi thao tác ghi tải lại dữ liệu (Frontend-Architecture 5.1).
export function useUpdateHotelPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: hotelPricingKeys.update,
    mutationFn: updateHotelPricing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotelPricingKeys.all }),
  });
}

/**
 * Trả về hàm đọc giá lưu trú mới nhất trong cache, chỉ khi lần tải gần nhất thành công; không thì `undefined`.
 * Nếu lần tải lại lỗi, cache còn dữ liệu TRƯỚC khi lưu; dùng nó để reset form sẽ kéo form về giá cũ dù backend đã lưu.
 */
export function useReadLatestHotelPricing() {
  const queryClient = useQueryClient();
  return () => {
    const state = queryClient.getQueryState<HotelPricing>(hotelPricingKeys.all);
    return state?.status === "success" ? state.data : undefined;
  };
}

/** Đang lưu bảng giá hay không; để nút “Lưu bảng giá” trên đầu trang hiện trạng thái đang gửi dù form nằm ở thành phần khác. */
export function useIsSavingHotelPricing() {
  return useIsMutating({ mutationKey: hotelPricingKeys.update }) > 0;
}
