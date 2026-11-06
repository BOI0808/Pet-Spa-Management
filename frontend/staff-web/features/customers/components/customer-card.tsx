"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import type { Customer, Pet } from "@/lib/api/types";
import { formatPhone, formatWeight, getInitials } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { usePets } from "@/lib/queries/pets";
import { petCreateRoute, petEditRoute } from "@/lib/routes";
import { setServingCustomer, type ServingCustomer } from "@/lib/serving-customer";

function toServingCustomer(customer: Customer): ServingCustomer {
  return { customerId: customer.customerId, fullName: customer.fullName, phone: customer.phone };
}

/** “Chó Poodle, 9,0 kg, nhóm Nhỏ” như ui-demo; giống đã bắt đầu bằng tên loài thì không lặp. */
function petSummary(pet: Pet) {
  const species = SPECIES_LABELS[pet.species];
  const kind = pet.breed.toLocaleLowerCase("vi-VN").startsWith(species.toLocaleLowerCase("vi-VN"))
    ? pet.breed
    : `${species} ${pet.breed}`;
  return `${kind}, ${formatWeight(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}`;
}

/** Khối “Thú cưng” trong thẻ khách: thẻ bấm được → SW-05 sửa hồ sơ. Lễ tân xem theo `customerId` (BR-16). */
function CustomerPets({ customer }: { customer: Customer }) {
  // Cửa hàng một chi nhánh, mỗi khách ít thú cưng: lấy 100 hồ sơ đầu là đủ (Frontend-Architecture 7.3).
  const pets = usePets({ customerId: customer.customerId, pageSize: 100 });

  if (pets.isPending) {
    return (
      <div aria-busy="true" aria-label="Đang tải thú cưng" className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
        <Skeleton className="h-[70px] rounded-xl" />
        <Skeleton className="h-[70px] rounded-xl" />
      </div>
    );
  }
  if (pets.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={pets.error} className="w-full" />
        <Button onClick={() => void pets.refetch()}>Thử lại</Button>
      </div>
    );
  }
  if (pets.data.items.length === 0) {
    return <p className="text-muted">Khách chưa có hồ sơ thú cưng nào.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
      {pets.data.items.map((pet) => (
        <li key={pet.petId}>
          {/* `.choice` của ui-demo dạng liên kết. Đặt khách đang phục vụ trước khi chuyển màn để SW-05 biết khách. */}
          <Link
            href={petEditRoute(customer.customerId, pet.petId)}
            onClick={() => setServingCustomer(toServingCustomer(customer))}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white p-3.5 text-ink hover:border-lagoon hover:bg-lagoon-25"
          >
            <PetAvatar species={pet.species} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block break-words font-semibold text-lagoon-700">{pet.name}</span>
              <span className="block break-words text-xs text-muted">{petSummary(pet)}</span>
            </span>
            <Icon name="chev-r" className="size-[18px] shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * SW-04 vùng 2 – một khách tìm thấy. Chưa có “Đặt lịch thay” (SW-06, thẻ 124) và “Lịch hẹn gần đây” (thẻ 125).
 * Nhãn “Có tài khoản” không hiện: API tìm khách chưa cho biết khách có tài khoản hay không (UI-Screens G-05).
 */
export function CustomerCard({ customer }: { customer: Customer }) {
  const router = useRouter();

  const addPet = () => {
    setServingCustomer(toServingCustomer(customer));
    router.push(petCreateRoute(customer.customerId));
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar initials={getInitials(customer.fullName)} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words">{customer.fullName}</h2>
              {customer.isBookingLocked ? (
                <Tag tone="lock">Bị khóa tự đặt lịch</Tag>
              ) : (
                <Tag tone="ok">Đang được tự đặt lịch</Tag>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
                <Icon name="phone" className="size-4" />
                {formatPhone(customer.phone)}
              </span>
              {customer.email && (
                <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                  <Icon name="mail" className="size-4" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>
          {/* Web nhân viên: vùng chạm tối thiểu 44px (SA 6.1). Màn hẹp: nút xuống dòng riêng để tên khách không bị bóp. */}
          <Button onClick={addPet} className="min-h-11 max-[640px]:w-full">
            <Icon name="plus" />
            Thêm thú cưng
          </Button>
        </div>

        <div className="my-5 h-px bg-line-soft" />
        <h3 className="mb-3">Thú cưng</h3>
        <CustomerPets customer={customer} />
      </div>
    </Card>
  );
}
