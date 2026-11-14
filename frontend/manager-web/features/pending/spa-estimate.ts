import type { Service, SizeGroup, Species } from "@/lib/api/types";

/**
 * Tạm tính của lịch spa = tổng giá các dịch vụ đã đặt theo loài và nhóm kích cỡ của thú cưng (giống cách backend tính, BR-26).
 * Trả `null` khi thiếu dịch vụ hoặc thiếu dòng giá phù hợp để không hiện một con số sai.
 */
export function estimateSpaAmount(
  services: readonly Service[],
  serviceIds: readonly string[],
  species: Species,
  sizeGroup: SizeGroup,
): number | null {
  if (serviceIds.length === 0) return null;
  let total = 0;
  for (const serviceId of serviceIds) {
    const price = services
      .find((service) => service.serviceId === serviceId)
      ?.pricing.find((row) => row.species === species && row.sizeGroup === sizeGroup)?.price;
    if (price === undefined) return null;
    total += price;
  }
  return total;
}
