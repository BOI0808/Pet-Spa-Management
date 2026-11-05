import { useQuery } from "@tanstack/react-query";
import { listServices } from "@/lib/api/endpoints/services";

export const serviceKeys = {
  all: ["services"] as const,
};

export function useServices() {
  return useQuery({ queryKey: serviceKeys.all, queryFn: listServices });
}
