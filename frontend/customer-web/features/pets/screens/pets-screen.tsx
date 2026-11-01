"use client";

// CW-04 Thú cưng của tôi (+ CW-04·D1 Gỡ hồ sơ) – UI-Screens.md
import Link from "next/link";
import { useState } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { useDeletePet, usePets } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { PetCard } from "../components/pet-card";

// Một khách có ít hồ sơ nên lấy một trang 50 (UI-Screens CW-04 vùng 2).
const PET_LIST_PARAMS = { page: 1, pageSize: 50 };

const REMOVE_CONSEQUENCES = [
  "Hồ sơ đã có lịch hẹn: chuyển sang ngừng hoạt động và ẩn đi. Cửa hàng vẫn giữ dữ liệu các lịch hẹn cũ.",
  "Hồ sơ chưa từng đặt lịch: xóa hẳn.",
];

function PetGridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
      {[0, 1].map((index) => (
        <Card key={index} className="p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="size-[72px] rounded-[22px]" />
            <div className="flex-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-2 h-3.5 w-32" />
              <Skeleton className="mt-3 h-6 w-36" />
            </div>
          </div>
          <Skeleton className="mt-4 h-14 w-full rounded-xl" />
          <Skeleton className="mt-4 h-[34px] w-40" />
        </Card>
      ))}
    </div>
  );
}

/** Vùng 3 – thẻ viền nét đứt “Thêm thú cưng”. */
function AddPetCard() {
  return (
    <Link
      href={ROUTES.petNew}
      className="flex min-h-[260px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-line bg-white p-5 text-center text-muted hover:border-lagoon"
    >
      <span className="grid size-14 place-items-center rounded-[18px] bg-lagoon-50 text-lagoon">
        <Icon name="plus" className="size-[22px]" />
      </span>
      <span className="font-semibold text-ink">Thêm thú cưng</span>
      <span className="text-xs">Chó, mèo, thỏ hoặc chuột lang</span>
    </Link>
  );
}

/** Vùng 5 – chưa có hồ sơ nào. */
function NoPets() {
  return (
    <Card>
      <EmptyState
        className="py-14"
        art={
          <div className="mb-2 flex gap-2">
            <PetAvatar species="Dog" size="lg" />
            <PetAvatar species="Cat" size="lg" />
            <PetAvatar species="Rabbit" size="lg" />
          </div>
        }
        title="Chưa có thú cưng"
        description="Thêm hồ sơ cho bé để xem giá đúng nhóm kích cỡ và bắt đầu đặt lịch."
        action={
          <ButtonLink href={ROUTES.petNew}>
            <Icon name="plus" />
            Thêm thú cưng
          </ButtonLink>
        }
      />
    </Card>
  );
}

export function PetsScreen() {
  const { showSuccess } = useToast();
  const pets = usePets(PET_LIST_PARAMS);
  const deletePet = useDeletePet();
  // Giữ cả hồ sơ đang gỡ để hộp thoại còn mở (kèm lỗi) dù danh sách đã tải lại sau lỗi 403/404.
  const [petToRemove, setPetToRemove] = useState<Pet | null>(null);

  function closeRemoveDialog() {
    setPetToRemove(null);
    deletePet.reset();
  }

  function handleConfirmRemove() {
    if (!petToRemove) return;
    deletePet.mutate(petToRemove.petId, {
      onSuccess: () => {
        closeRemoveDialog();
        showSuccess("Đã gỡ hồ sơ thú cưng");
      },
    });
  }

  let content;
  if (pets.isPending) {
    content = <PetGridSkeleton />;
  } else if (pets.isError) {
    content = isForbiddenError(pets.error) ? (
      <ForbiddenState />
    ) : (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={pets.error} className="w-full" />
        <Button onClick={() => void pets.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (pets.data.items.length === 0) {
    content = <NoPets />;
  } else {
    content = (
      <>
        <div className="grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
          {pets.data.items.map((pet) => (
            <PetCard key={pet.petId} pet={pet} onRemove={setPetToRemove} />
          ))}
          <AddPetCard />
        </div>
        {/* Vùng 4 – gợi ý cập nhật cân nặng. */}
        <Alert className="mt-4">
          Cân nặng của bé thay đổi? Cập nhật hồ sơ để giá tạm tính sát hơn. Cửa hàng vẫn cân lại khi tiếp nhận.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Thú cưng của tôi"
        description="Hồ sơ dùng để tính giá, thời lượng dịch vụ và chọn chuồng phù hợp."
        actions={
          <ButtonLink href={ROUTES.petNew} variant="primary">
            <Icon name="plus" />
            Thêm thú cưng
          </ButtonLink>
        }
      />
      {content}
      {/* CW-04·D1 – BR-25: backend quyết định xóa hẳn hay ngừng hoạt động. */}
      <ConfirmDialog
        open={petToRemove !== null}
        onClose={closeRemoveDialog}
        onConfirm={handleConfirmRemove}
        icon="trash"
        title="Gỡ hồ sơ thú cưng?"
        description="Bé sẽ không còn trong danh sách của bạn."
        consequences={REMOVE_CONSEQUENCES}
        cancelLabel="Giữ hồ sơ"
        confirmLabel="Gỡ hồ sơ"
        loading={deletePet.isPending}
        error={deletePet.error}
      />
    </>
  );
}
