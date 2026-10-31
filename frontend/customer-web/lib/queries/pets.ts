import { useQuery } from "@tanstack/react-query";
import { listPets, type PetListParams } from "@/lib/api/endpoints/pets";

export const petKeys = {
  all: ["pets"] as const,
  list: (params: PetListParams) => ["pets", "list", params] as const,
};

export function usePets(params: PetListParams) {
  return useQuery({ queryKey: petKeys.list(params), queryFn: () => listPets(params) });
}
