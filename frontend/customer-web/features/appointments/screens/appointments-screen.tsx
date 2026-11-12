"use client";

// CW-08 Lịch hẹn của tôi – UI-Screens.md
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pager } from "@/components/ui/pager";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { isForbiddenError } from "@/lib/api/errors";
import type { Appointment, AppointmentType, Pet } from "@/lib/api/types";
import { useAppointments, useAppointmentsByStatuses } from "@/lib/queries/appointments";
import { usePets } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { getStoreToday } from "@/lib/time";
import {
  APPOINTMENT_TAB_LABELS,
  APPOINTMENT_TABS,
  joinNames,
  ONGOING_STATUSES,
  parsePage,
  parseTab,
  parseType,
  sortByStart,
  type AppointmentTab,
} from "../appointments";
import { AppointmentListTicket } from "../components/appointment-list-ticket";

const PET_LIST_PARAMS = { page: 1, pageSize: 50 };
/** 20 lịch/trang (UI-Screens CW-08). */
const PAGE_SIZE = 20;
/**
 * API chỉ lọc một trạng thái (G-06): tab 1 gọi song song từng trạng thái chưa kết thúc, mỗi trạng thái một trang
 * cỡ tối đa (100), rồi gộp, sắp xếp và phân trang ở web. Số trên tab là tổng thật của backend.
 */
const ONGOING_SOURCE_SIZE = 100;
const PANEL_ID = "appointment-tab-panel";

const TYPE_FILTERS: { value: AppointmentType | undefined; label: string; icon?: "droplet" | "bed" }[] = [
  { value: undefined, label: "Tất cả" },
  { value: "Spa", label: "Spa", icon: "droplet" },
  { value: "Hotel", label: "Lưu trú", icon: "bed" },
];

const EMPTY_TITLES: Record<AppointmentTab, string> = {
  upcoming: "Chưa có lịch hẹn sắp tới",
  completed: "Chưa có lịch hẹn đã hoàn tất",
  cancelled: "Không có lịch hẹn đã hủy",
};

function TicketListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="flex flex-col gap-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="grid grid-cols-[104px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-white max-[640px]:grid-cols-[84px_minmax(0,1fr)]"
        >
          <div className="flex flex-col items-center gap-2 border-r-[1.5px] border-dashed border-line bg-lagoon-25 px-3 py-4">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-3.5 px-[18px] py-3.5">
            <Skeleton className="size-11 rounded-[14px]" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3.5 w-56 max-w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyTab({ tab }: { tab: AppointmentTab }) {
  return (
    <Card>
      <EmptyState
        icon="calendar"
        title={EMPTY_TITLES[tab]}
        action={
          tab === "upcoming" ? (
            <ButtonLink href={ROUTES.spaBooking}>
              <Icon name="plus" />
              Đặt lịch spa
            </ButtonLink>
          ) : undefined
        }
      />
    </Card>
  );
}

export function AppointmentsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const type = parseType(searchParams.get("type"));
  const page = parsePage(searchParams.get("page"));
  // Hôm nay theo múi giờ cửa hàng, cố định trong lần mở màn.
  const [today] = useState(getStoreToday);

  const pets = usePets(PET_LIST_PARAMS);
  // Tab 2, 3 lọc trạng thái ở backend; tổng số (`total`) dùng luôn cho số trên tab.
  const ongoing = useAppointmentsByStatuses(ONGOING_STATUSES, { type, pageSize: ONGOING_SOURCE_SIZE });
  const completed = useAppointments({ type, status: "Completed", page: tab === "completed" ? page : 1, pageSize: PAGE_SIZE });
  const cancelled = useAppointments({ type, status: "Cancelled", page: tab === "cancelled" ? page : 1, pageSize: PAGE_SIZE });

  const ongoingItems = sortByStart(ongoing.items, "asc");
  const counts: Record<AppointmentTab, number | undefined> = {
    upcoming: ongoing.total,
    completed: completed.data?.total,
    cancelled: cancelled.data?.total,
  };

  function updateQuery(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const petById = new Map<string, Pet>((pets.data?.items ?? []).map((pet) => [pet.petId, pet]));
  const petNames = (pets.data?.items ?? []).map((pet) => pet.name);
  const description =
    petNames.length > 0 ? `Lịch spa và lưu trú của ${joinNames(petNames)}.` : "Lịch spa và lưu trú của các bé.";

  // Nội dung theo tab đang chọn: tab 1 lấy từ các danh sách đã gộp, tab 2, 3 từ một danh sách của backend.
  const statusList = tab === "completed" ? completed : cancelled;
  const isPending = tab === "upcoming" ? ongoing.isPending : statusList.isPending;
  const error = tab === "upcoming" ? ongoing.error : statusList.error;
  const retry = tab === "upcoming" ? ongoing.refetch : () => void statusList.refetch();

  let content;
  if (isPending) {
    content = <TicketListSkeleton />;
  } else if (error) {
    content = isForbiddenError(error) ? (
      <ForbiddenState />
    ) : (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button onClick={retry}>Thử lại</Button>
      </div>
    );
  } else {
    let items: Appointment[];
    let total: number;
    if (tab === "upcoming") {
      // Phân trang ở web trên các lịch đã tải.
      total = ongoingItems.length;
      items = ongoingItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    } else {
      total = statusList.data?.total ?? 0;
      items = sortByStart(statusList.data?.items ?? [], "desc");
    }
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    content =
      items.length === 0 && total > 0 ? (
        // `?page=` vượt quá số trang (nhập tay, hoặc danh sách vừa ngắn lại): cho về trang cuối còn lịch.
        <Card>
          <EmptyState
            icon="calendar"
            title="Trang này không có lịch hẹn"
            action={
              <Button onClick={() => updateQuery({ page: lastPage > 1 ? String(lastPage) : undefined })}>
                Về trang {lastPage}
              </Button>
            }
          />
        </Card>
      ) : items.length === 0 ? (
        <EmptyTab tab={tab} />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((appointment) => (
              <AppointmentListTicket
                key={appointment.appointmentId}
                appointment={appointment}
                pet={petById.get(appointment.petId) ?? null}
                tab={tab}
                today={today}
              />
            ))}
          </ul>
          <Pager
            className="mt-4 justify-end"
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={(next) => updateQuery({ page: next > 1 ? String(next) : undefined })}
          />
          {tab === "upcoming" && ongoing.truncated && (
            <Alert tone="neutral" className="mt-4">
              Danh sách đang hiện tối đa {ONGOING_SOURCE_SIZE} lịch tạo gần nhất của mỗi trạng thái.
            </Alert>
          )}
        </>
      );
  }

  return (
    <>
      <PageHeader
        title="Lịch hẹn của tôi"
        description={description}
        actions={
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink href={ROUTES.history} variant="secondary">
              <Icon name="history" />
              Lịch sử dịch vụ
            </ButtonLink>
            <ButtonLink href={ROUTES.spaBooking} variant="primary">
              <Icon name="plus" />
              Đặt lịch spa
            </ButtonLink>
          </div>
        }
      />
      <Tabs
        label="Nhóm lịch hẹn"
        panelId={PANEL_ID}
        value={tab}
        onChange={(next) => updateQuery({ tab: next === "upcoming" ? undefined : next, page: undefined })}
        items={APPOINTMENT_TABS.map((value) => ({ value, label: APPOINTMENT_TAB_LABELS[value], count: counts[value] }))}
      />
      <div role="group" aria-label="Lọc theo loại lịch" className="mb-4 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => (
          <FilterChip
            key={filter.label}
            active={filter.value === type}
            onClick={() => updateQuery({ type: filter.value, page: undefined })}
          >
            {filter.icon && <Icon name={filter.icon} className="size-4" />}
            {filter.label}
          </FilterChip>
        ))}
      </div>
      <div id={PANEL_ID} role="tabpanel" aria-label={APPOINTMENT_TAB_LABELS[tab]}>
        {content}
      </div>
    </>
  );
}

export function AppointmentsSkeleton() {
  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <TicketListSkeleton />
    </>
  );
}
