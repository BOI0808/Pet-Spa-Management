"use client";

// CW-03 Trang chủ: danh mục dịch vụ và giá lưu trú – UI-Screens.md
import { BookingNotes } from "../components/booking-notes";
import { HomeHero } from "../components/home-hero";
import { HotelPricingTable } from "../components/hotel-pricing-table";
import { ServiceCatalog } from "../components/service-catalog";
import { StoreContact } from "../components/store-contact";

export function HomeScreen() {
  return (
    <>
      <HomeHero />
      <ServiceCatalog />
      <div className="mt-8 grid grid-cols-2 items-start gap-4 max-[980px]:grid-cols-1">
        <HotelPricingTable />
        <BookingNotes />
      </div>
      <StoreContact />
    </>
  );
}
