import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPet, deletePet, getPet, listPets, updatePet, type PetListParams } from "@/lib/api/endpoints/pets";
import type { PetRequest } from "@/lib/api/types";

export const petKeys = {
  all: ["pets"] as const,
  list: (params: PetListParams) => ["pets", "list", params] as const,
  detail: (petId: string) => ["pets", "detail", petId] as const,
};

export function usePets(params: PetListParams) {
  return useQuery({ queryKey: petKeys.list(params), queryFn: () => listPets(params) });
}

export function usePet(petId: string) {
  return useQuery({ queryKey: petKeys.detail(petId), queryFn: () => getPet(petId) });
}

// Tạo/sửa/gỡ thú cưng: làm mới mọi khóa `pets` (Frontend-Architecture 5.1), kể cả khi lỗi 403/404
// vì hồ sơ có thể đã bị gỡ ở nơi khác (UI-Screens CW-04, CW-05).
function useInvalidatePets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: petKeys.all });
}

function isGoneError(status: number | null) {
  return status === 403 || status === 404;
}

export function useCreatePet() {
  const invalidatePets = useInvalidatePets();
  return useMutation({
    mutationFn: createPet,
    onSuccess: invalidatePets,
  });
}

export function useUpdatePet() {
  const invalidatePets = useInvalidatePets();
  return useMutation({
    mutationFn: ({ petId, body }: { petId: string; body: PetRequest }) => updatePet(petId, body),
    onSuccess: invalidatePets,
    onError: (error) => {
      if (isGoneError(error.status)) void invalidatePets();
    },
  });
}

export function useDeletePet() {
  const invalidatePets = useInvalidatePets();
  return useMutation({
    mutationFn: deletePet,
    onSuccess: invalidatePets,
    onError: (error) => {
      if (isGoneError(error.status)) void invalidatePets();
    },
  });
}
