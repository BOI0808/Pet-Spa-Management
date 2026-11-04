import { useQuery } from "@tanstack/react-query";
import { getHotelPricing } from "@/lib/api/endpoints/hotel-pricing";

export const hotelPricingKeys = {
  all: ["hotel-pricing"] as const,
};

export function useHotelPricing() {
  return useQuery({ queryKey: hotelPricingKeys.all, queryFn: getHotelPricing });
}
