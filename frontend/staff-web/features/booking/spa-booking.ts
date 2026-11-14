import type { Pet, Service } from "@/lib/api/types";
import { formatWeight } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";

// Hàm thuần của phần lịch spa ở SW-06, chép từ customer-web (features/booking/spa-booking.ts) và giữ cùng tên.

/** Dịch vụ kèm giá, thời lượng, số nhân viên theo loài và nhóm kích cỡ của bé. */
export type PricedService = {
  serviceId: string;
  name: string;
  latestStartTime: string;
  price: number;
  durationMinutes: number;
  staffRequired: number;
};

/** Chỉ giữ dịch vụ có dòng giá cho bé (BR-02, BR-11), nên dịch vụ không áp dụng không chọn được (FR-BOOK-01). */
export function toPricedServices(services: Service[], pet: Pet): PricedService[] {
  return services.flatMap(({ serviceId, name, latestStartTime, pricing }) => {
    const row = pricing.find((item) => item.species === pet.species && item.sizeGroup === pet.sizeGroup);
    return row ? [{ serviceId, name, latestStartTime, ...row }] : [];
  });
}

/**
 * Tạm tính ở web chỉ để xem khi chưa có `GET /spa/slots` (UI-Screens CW-06 vùng 4):
 * tổng phút, số nhân viên = lớn nhất `staffRequired`, tối thiểu 2 nếu bé khó tính (BR-13).
 */
export function estimateBooking(services: PricedService[], pet: Pet | null) {
  const staffRequired = Math.max(1, ...services.map((service) => service.staffRequired));
  return {
    total: services.reduce((sum, service) => sum + service.price, 0),
    durationMinutes: services.reduce((sum, service) => sum + service.durationMinutes, 0),
    staffRequired: pet?.temperament === "Difficult" ? Math.max(staffRequired, 2) : staffRequired,
  };
}

/** Dịch vụ có mốc bắt đầu muộn nhất sớm nhất, quyết định mốc cuối của lịch (BR-13). */
export function earliestLatestStart(services: PricedService[]) {
  return services.reduce<PricedService | null>(
    (earliest, service) => (!earliest || service.latestStartTime < earliest.latestStartTime ? service : earliest),
    null,
  );
}

/**
 * Thẻ chọn thú cưng ở SW-06 vùng 3: “Chó Corgi, 11,0 kg, nhóm Vừa, khó tính, dữ”. Khác customer-web ở phần tính cách:
 * chỉ thêm khi bé khó tính (như ui-demo), để lễ tân biết vì sao lịch cần 2 nhân viên; bé hiền, bình thường thì bỏ cho gọn.
 */
export function describePet(pet: Pet) {
  const base = `${SPECIES_LABELS[pet.species]} ${pet.breed}, ${formatWeight(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
  return pet.temperament === "Difficult"
    ? `${base}, ${TEMPERAMENT_LABELS.Difficult.toLocaleLowerCase("vi-VN")}`
    : base;
}
