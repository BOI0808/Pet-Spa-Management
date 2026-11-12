"use client";

// CW-11 Lịch sử dịch vụ – UI-Screens.md
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SpeciesIllustration } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { isForbiddenError } from "@/lib/api/errors";
import type { Pet } from "@/lib/api/types";
import { useInfiniteAppointments } from "@/lib/queries/appointments";
import { usePets } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { sortByStart } from "../appointments";
import { HistoryCard } from "../components/history-card";

const PET_LIST_PARAMS = { page: 1, pageSize: 50 };
/** 10 lịch mỗi lần “Xem thêm” (UI-Screens CW-11 vùng 2). */
const PAGE_SIZE = 10;

const TITLE = "Lịch sử dịch vụ";
const DESCRIPTION = "Các lịch hẹn đã hoàn tất của từng bé.";

function HistoryListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="flex flex-col gap-3">
      {[0, 1, 2].map((index) => (
        <Card key={index} className="flex gap-5 p-5">
          <div className="w-[110px]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-4 w-64 max-w-full" />
            <Skeleton className="mt-2 h-3 w-48 max-w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <HistoryListSkeleton />
    </>
  );
}

/** Vùng 2, 3 – lịch hoàn tất của một bé, tải thêm từng trang. */
function PetHistory({ petId, pet }: { petId: string; pet: Pet | null }) {
  const history = useInfiniteAppointments({ status: "Completed", petId, pageSize: PAGE_SIZE });

  if (history.isPending) return <HistoryListSkeleton />;
  // Lỗi khi tải thêm trang vẫn giữ các trang đã có (lỗi hiện dưới danh sách).
  if (history.isError && !history.data) {
    // Thú cưng của khách khác (kể cả nhập `?petId=` tay) → 403 (FR-BOOK-05, BR-16).
    if (isForbiddenError(history.error)) return <ForbiddenState />;
    // `?petId=` sai định dạng (400) hoặc không tồn tại (404).
    if (history.error.status === 400 || history.error.status === 404) {
      return (
        <NotFoundState
          title="Không tìm thấy thú cưng"
          action={<ButtonLink href={ROUTES.history}>Về lịch sử dịch vụ</ButtonLink>}
        />
      );
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={history.error} className="w-full" />
        <Button onClick={() => void history.refetch()}>Thử lại</Button>
      </div>
    );
  }

  const items = sortByStart(
    history.data.pages.flatMap((page) => page.items),
    "desc",
  );
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="history"
          title={`${pet?.name ?? "Bé"} chưa có lịch hẹn hoàn tất.`}
          action={
            // Hồ sơ đã gỡ (mở qua URL) không đặt lịch được nên không có nút.
            pet ? (
              <ButtonLink href={ROUTES.spaBookingForPet(petId)}>
                <Icon name="plus" />
                Đặt lịch spa
              </ButtonLink>
            ) : undefined
          }
        />
      </Card>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((appointment) => (
          <HistoryCard key={appointment.appointmentId} appointment={appointment} />
        ))}
      </ul>
      {history.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            disabled={history.isFetchingNextPage}
            aria-busy={history.isFetchingNextPage || undefined}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? "Đang tải…" : "Xem thêm"}
          </Button>
        </div>
      )}
      {history.isFetchNextPageError && <ErrorAlert error={history.error} className="mt-3" />}
    </>
  );
}

function PetPicker({ pets, value, onChange }: { pets: Pet[]; value: string | null; onChange: (petId: string) => void }) {
  return (
    <SegmentedControl
      label="Chọn thú cưng"
      className="max-[640px]:w-full"
      value={value ?? ""}
      onChange={onChange}
      options={pets.map((pet) => ({
        value: pet.petId,
        label: pet.name,
        icon: <SpeciesIllustration species={pet.species} />,
      }))}
    />
  );
}

export function HistoryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pets = usePets(PET_LIST_PARAMS);

  function selectPet(petId: string) {
    router.replace(`${pathname}?petId=${encodeURIComponent(petId)}`, { scroll: false });
  }

  if (pets.isPending) return <HistorySkeleton />;
  if (pets.isError) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        {isForbiddenError(pets.error) ? (
          <ForbiddenState />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={pets.error} className="w-full" />
            <Button onClick={() => void pets.refetch()}>Thử lại</Button>
          </div>
        )}
      </>
    );
  }

  // `?petId=` từ CW-04 hoặc nhập tay; chuỗi rỗng coi như không có (tránh gửi `petId=` làm backend bỏ lọc).
  // petId không có trong danh sách (hồ sơ đã gỡ, hoặc của khách khác) vẫn gửi để backend kiểm tra quyền (BR-16).
  const requestedPetId = searchParams.get("petId")?.trim() || null;
  const items = pets.data.items;
  if (items.length === 0 && !requestedPetId) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <Card>
          <EmptyState
            title="Chưa có thú cưng"
            description="Thêm hồ sơ cho bé để đặt lịch và xem lại lịch sử chăm sóc."
            action={
              <ButtonLink href={ROUTES.petNew}>
                <Icon name="plus" />
                Thêm thú cưng
              </ButtonLink>
            }
          />
        </Card>
      </>
    );
  }

  // Không có `?petId=` thì chọn bé đầu tiên.
  const petId = requestedPetId ?? items[0].petId;
  const selectedPet = items.find((pet) => pet.petId === petId) ?? null;

  return (
    <>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        actions={
          items.length > 0 ? (
            <PetPicker pets={items} value={selectedPet?.petId ?? null} onChange={selectPet} />
          ) : undefined
        }
      />
      <PetHistory key={petId} petId={petId} pet={selectedPet} />
    </>
  );
}
