import { useQuery } from "@tanstack/react-query";
import { listServices, type ServiceListParams } from "@/lib/api/endpoints/services";

export const serviceKeys = {
  all: ["services"] as const,
  list: (params: ServiceListParams) => ["services", "list", params] as const,
};

export function useServices(params: ServiceListParams = {}, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: serviceKeys.list(params), queryFn: () => listServices(params), enabled });
}
