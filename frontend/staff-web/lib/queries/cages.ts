import { useQuery } from "@tanstack/react-query";
import { listCages, type CageListParams } from "@/lib/api/endpoints/cages";

export const cageKeys = {
  all: ["cages"] as const,
  list: (params: CageListParams) => ["cages", "list", params] as const,
};

// Cửa hàng một chi nhánh, số chuồng ít: một trang 100 chuồng là đủ để tra mã theo `cageId`.
const CAGE_LIST_PARAMS = { page: 1, pageSize: 100 };

export function useCages({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: cageKeys.list(CAGE_LIST_PARAMS), queryFn: () => listCages(CAGE_LIST_PARAMS), enabled });
}
