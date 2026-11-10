import { useQuery } from "@tanstack/react-query";
import { getPet } from "@/lib/api/endpoints/pets";

// Hồ sơ thú cưng ít đổi; MW-04 gọi cho từng phiếu trong danh sách nên giữ 60 giây để đổi tab, đổi bộ lọc không gọi lại.
const PET_STALE_MS = 60_000;

export const petKeys = {
  all: ["pets"] as const,
  detail: (petId: string) => [...petKeys.all, petId] as const,
};

export function usePet(petId: string) {
  return useQuery({ queryKey: petKeys.detail(petId), queryFn: () => getPet(petId), staleTime: PET_STALE_MS });
}
