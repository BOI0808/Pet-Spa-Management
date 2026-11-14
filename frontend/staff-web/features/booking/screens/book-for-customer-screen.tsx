"use client";

// SW-06 Đặt lịch thay khách – UI-Screens.md, UC-10, UC-28, UF-03. Chỉ lễ tân (route-access.ts).
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { usePets } from "@/lib/queries/pets";
import { ROUTES, bookForCustomerRoute, petCreateRoute, type BookingType } from "@/lib/routes";
import { useServingCustomer, type ServingCustomer } from "@/lib/serving-customer";
import { BOOKING_SPLIT_CLASS } from "../components/booking-summary-card";
import { HotelBookingForm } from "../components/hotel-booking-form";
import { PetPickerCard } from "../components/pet-picker-card";
import { ServingCustomerBar } from "../components/serving-customer-bar";
import { SpaBookingForm } from "../components/spa-booking-form";

const TAB_ITEMS = [
  { value: "Spa", label: "Lịch spa" },
  { value: "Hotel", label: "Lưu trú" },
] as const satisfies readonly { value: BookingType; label: string }[];

const PANEL_ID = "booking-panel";

/** `?type=` lạ hoặc thiếu thì mở tab Lịch spa. */
function parseType(value: string | null): BookingType {
  return value === "Hotel" ? "Hotel" : "Spa";
}

export function BookingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className={BOOKING_SPLIT_CLASS}>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/** Vùng 2 → 8 khi đã có khách đang phục vụ. */
function BookingForCustomer({ customer }: { customer: ServingCustomer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Cửa hàng một chi nhánh, mỗi khách ít thú cưng: lấy 100 hồ sơ đầu là đủ (giống thẻ khách ở SW-04).
  const pets = usePets({ customerId: customer.customerId, pageSize: 100 });

  // Loại lịch và thú cưng giữ trên URL (User-Flows 2.2): tải lại trang hay đổi tab vẫn giữ bé đã chọn.
  const type = parseType(searchParams.get("type"));
  const petId = searchParams.get("petId");

  function updateUrl(next: { petId?: string | null; type?: BookingType }) {
    const route = bookForCustomerRoute({
      customerId: customer.customerId,
      petId: next.petId === undefined ? petId : next.petId,
      type: next.type ?? type,
    });
    // `replace`: chọn bé, đổi tab không tạo thêm mục lịch sử; `scroll: false` để màn không nhảy lên đầu.
    router.replace(route, { scroll: false });
  }

  let content;
  if (pets.isPending) {
    content = <BookingSkeleton />;
  } else if (pets.isError) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={pets.error} className="w-full" />
        <Button onClick={() => void pets.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (pets.data.items.length === 0) {
    content = (
      <Card>
        <EmptyState
          title="Khách chưa có thú cưng"
          description="Tạo hồ sơ thú cưng cho khách trước khi đặt lịch."
          action={
            <ButtonLink href={petCreateRoute(customer.customerId)}>
              <Icon name="plus" />
              Thêm thú cưng
            </ButtonLink>
          }
        />
      </Card>
    );
  } else {
    // `petId` trên URL không thuộc khách này (liên kết cũ) thì coi như chưa chọn bé.
    const pet = pets.data.items.find((item) => item.petId === petId) ?? null;
    const petCard = (
      <PetPickerCard
        customerId={customer.customerId}
        pets={pets.data.items}
        petId={pet?.petId ?? null}
        onSelect={(nextPetId) => updateUrl({ petId: nextPetId })}
      />
    );
    // Vùng 6 (Đề xuất): chỉ hiện khi biết chắc là khách vãng lai – xem ServingCustomerBar.
    const notice = customer.isWalkIn ? (
      <Alert tone="neutral">
        Khách vãng lai không nhận thông báo trên web. Hãy báo khách giờ hẹn và nói rõ lịch đang chờ cửa hàng xác nhận.
      </Alert>
    ) : null;
    const formProps = { customerId: customer.customerId, pet, petCard, notice };

    content = (
      <>
        <Tabs label="Loại lịch" items={TAB_ITEMS} value={type} onChange={(next) => updateUrl({ type: next })} panelId={PANEL_ID} />
        {/* Chỉ giữ tab đang mở: hai tab có ô và kết quả khác nhau, đổi tab thì bắt đầu lại phần riêng của tab đó. */}
        <div id={PANEL_ID} role="tabpanel" aria-label={type === "Spa" ? "Lịch spa" : "Lưu trú"}>
          {type === "Spa" ? <SpaBookingForm {...formProps} /> : <HotelBookingForm {...formProps} />}
        </div>
      </>
    );
  }

  return (
    <>
      <ServingCustomerBar customer={customer} />
      {content}
    </>
  );
}

/** `/dat-lich` (`?customerId=&petId=&type=Spa|Hotel`). */
export function BookForCustomerScreen() {
  const searchParams = useSearchParams();
  const servingCustomer = useServingCustomer();
  const urlCustomerId = searchParams.get("customerId");

  let content;
  if (servingCustomer === undefined) {
    // Chưa đọc được sessionStorage (render ở server, lúc hydrate).
    content = <BookingSkeleton />;
  } else if (servingCustomer === null || (urlCustomerId !== null && urlCustomerId !== servingCustomer.customerId)) {
    // Không có GET /customers/{id} (G-14) nên chỉ đặt cho khách đang phục vụ. `customerId` trên URL khác khách đó
    // (liên kết cũ, tab khác) thì không đoán, để lễ tân chọn lại khách ở SW-04 – tránh đặt nhầm người.
    content = (
      <Card>
        <EmptyState
          title="Chưa chọn khách hàng"
          description="Tìm khách theo số điện thoại hoặc ghi nhận khách vãng lai, rồi đặt lịch cho khách."
          action={
            <ButtonLink href={ROUTES.customers}>
              <Icon name="search" />
              Tìm khách
            </ButtonLink>
          }
        />
      </Card>
    );
  } else {
    content = <BookingForCustomer customer={servingCustomer} />;
  }

  return (
    <>
      <PageHeader
        title="Đặt lịch thay khách"
        description="Dùng khi khách đến quầy hoặc gọi điện. Không áp dụng khóa tự đặt lịch."
      />
      {content}
    </>
  );
}
