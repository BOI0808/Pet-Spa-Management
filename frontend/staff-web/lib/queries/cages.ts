import { useQuery } from "@tanstack/react-query";
import { listCages, type CageListParams } from "@/lib/api/endpoints/cages";

export const cageKeys = {
  all: ["cages"] as const,
  list: (params: CageListParams) => ["cages", "list", params] as const,
};

// Cửa hàng một chi nhánh, số chuồng ít: một trang 100 chuồng là đủ để tra mã theo `cageId`.
const CAGE_LIST_PARAMS = { page: 1, pageSize: 100 };

// Chuồng đổi khi lễ tân khác tiếp nhận, trả bé: SW-08 tải lại 60 giây/lần như danh sách lịch hẹn.
const CAGE_REFETCH_MS = 60_000;

type CageQueryOptions = {
  enabled?: boolean;
  /** Tự tải lại định kỳ: chỉ bật ở SW-08; màn khác chỉ cần tra mã chuồng. */
  live?: boolean;
};

export function useCages({ enabled = true, live = false }: CageQueryOptions = {}) {
  return useQuery({
    queryKey: cageKeys.list(CAGE_LIST_PARAMS),
    queryFn: () => listCages(CAGE_LIST_PARAMS),
    enabled,
    refetchInterval: live ? CAGE_REFETCH_MS : false,
  });
}
