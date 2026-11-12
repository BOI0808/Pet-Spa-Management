import type { HotelPricing, SizeGroup, Species } from "@/lib/api/types";
import { toStoreDate } from "@/lib/time";

const DAY_MS = 86_400_000;

// Ngày dạng “YYYY-MM-DD” (đã theo múi giờ cửa hàng, lib/time.ts); tính trên UTC nên không lệch do giờ mùa hè của máy người dùng.
function toUtcMs(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

/**
 * Các đêm lưu trú dạng “YYYY-MM-DD”: từ ngày nhận đến trước ngày trả, theo ngày ở múi giờ cửa hàng (BR-22; giống backend `PricingService.CountNights`).
 * Ngày trả không sau ngày nhận thì trả về mảng rỗng.
 */
export function getStayNights(checkInIso: string, checkOutIso: string) {
  const firstNight = toStoreDate(checkInIso);
  const nights = Math.round((toUtcMs(toStoreDate(checkOutIso)) - toUtcMs(firstNight)) / DAY_MS);
  return Array.from({ length: Math.max(nights, 0) }, (_, index) =>
    new Date(toUtcMs(firstNight) + index * DAY_MS).toISOString().slice(0, 10),
  );
}

export type StayEstimate = {
  nights: number;
  pricePerNight: number;
  foodPerNight: number;
  total: number;
};

/**
 * Tiền lưu trú tạm tính = số đêm × (giá lưu trú + giá thức ăn mỗi đêm) theo loài và nhóm kích cỡ (BR-22).
 * Chỉ để hiển thị cho Quản lý; số tiền thật do backend tính lại khi xác nhận (BR-26) và không bao giờ gửi từ web.
 * Trả về `null` khi chưa có giá cho loài và nhóm này hoặc số đêm không hợp lệ.
 */
export function estimateStay(
  pricing: HotelPricing,
  species: Species,
  sizeGroup: SizeGroup,
  nights: number,
): StayEstimate | null {
  const row = pricing.pricing.find((item) => item.species === species && item.sizeGroup === sizeGroup);
  if (!row || nights <= 0) return null;
  return {
    nights,
    pricePerNight: row.pricePerNight,
    foodPerNight: row.foodPerNight,
    total: nights * (row.pricePerNight + row.foodPerNight),
  };
}
