import { useMutation } from "@tanstack/react-query";
import { createCage, setCageStatus, updateCage } from "@/lib/api/endpoints/cages";

// Chưa có query danh sách chuồng nên chưa có khóa query và chưa tải lại sau khi ghi; thẻ 150 thêm cùng GET /cages.

export function useCreateCage() {
  return useMutation({ mutationFn: createCage });
}

export function useUpdateCage() {
  return useMutation({ mutationFn: updateCage });
}

export function useSetCageStatus() {
  return useMutation({ mutationFn: setCageStatus });
}
