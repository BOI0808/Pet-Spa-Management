"use client";

// SW-02 Lịch hẹn – phần lễ tân: lịch toàn cửa hàng theo ngày (UI-Screens SW-02 vùng 1 → 3, FR-EXE-01, UF-03).
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { FilterChip } from "@/components/ui/filter-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFullDate } from "@/lib/format";
import { useAppointments } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { ROUTES, appointmentsOnDateRoute } from "@/lib/routes";
import { getStoreToday } from "@/lib/time";
import {
  RECEPTION_FILTERS,
  RECEPTION_FILTER_LABELS,
  matchesReceptionFilter,
  parseDateParam,
  sortByRowMoment,
  type ReceptionFilter,
} from "../appointments";
import { ReceptionRow } from "../components/reception-row";

const COLUMNS = ["Giờ", "Thú cưng", "Khách hàng", "Loại", "Nhân viên / chuồng", "Trạng thái", "Thao tác"];

function TableSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải lịch hẹn" className="flex flex-col gap-3 p-5">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </div>
  );
}

export function ReceptionAppointmentsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Tính lại mỗi lần vẽ (danh sách tải lại 60 giây/lần): mở màn qua nửa đêm thì “hôm nay” vẫn đúng.
  const today = getStoreToday();
  const date = parseDateParam(searchParams.get("date"), today);
  // Chip không giữ trên URL: UI-Screens chỉ quy định `?date=`; đổi ngày thì về “Tất cả”.
  const [filter, setFilter] = useState<ReceptionFilter>("all");
  const [filterDate, setFilterDate] = useState(date);
  if (filterDate !== date) {
    setFilterDate(date);
    setFilter("all");
  }

  // Backend lọc theo ngày (spa: giờ bắt đầu; lưu trú: ngày nhận hoặc ngày trả) và sắp theo giờ hẹn.
  const list = useAppointments({ date, sort: "time_asc", page: 1, pageSize: 100 });
  const cages = useCages();
  const cageCodes = useMemo(
    () => new Map((cages.data?.items ?? []).map((cage) => [cage.cageId, cage.code])),
    [cages.data],
  );

  function changeDate(next: string) {
    // `replace`: đổi ngày không chồng thêm mục lịch sử; xóa trắng ô thì về hôm nay.
    router.replace(appointmentsOnDateRoute(next === today ? "" : next), { scroll: false });
  }

  let content;
  if (list.isPending) {
    content = (
      <Card>
        <TableSkeleton />
      </Card>
    );
  } else if (list.isError) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={list.error} className="w-full" />
        <Button onClick={() => void list.refetch()}>Thử lại</Button>
      </div>
    );
  } else {
    const items = sortByRowMoment(list.data.items, date);
    const visible = items.filter((item) => matchesReceptionFilter(item, filter, date));
    content = (
      <>
        <div role="group" aria-label="Lọc nhanh" className="mb-4 flex flex-wrap gap-2">
          {RECEPTION_FILTERS.map((value) => (
            <FilterChip key={value} active={filter === value} onClick={() => setFilter(value)}>
              {RECEPTION_FILTER_LABELS[value]}
              <span className={`text-xs ${filter === value ? "text-white/80" : "text-muted"}`}>
                {items.filter((item) => matchesReceptionFilter(item, value, date)).length}
              </span>
            </FilterChip>
          ))}
        </div>
        <Card className="overflow-hidden">
          {visible.length === 0 ? (
            <EmptyState
              title={items.length === 0 ? "Không có lịch hẹn trong ngày này." : "Không có lịch hẹn nào ở mục này."}
              icon="calendar"
            />
          ) : (
            // Bảng rộng hơn màn hẹp: cuộn ngang trong thẻ, trang không cuộn ngang (Design-System 6).
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className={`border-b border-line bg-mist px-4 py-2.5 text-xs font-semibold text-muted ${
                          column === "Thao tác" ? "text-right" : ""
                        }`}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((appointment) => (
                    <ReceptionRow
                      key={appointment.appointmentId}
                      appointment={appointment}
                      date={date}
                      today={today}
                      cageCodes={cageCodes}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        {list.data.total > list.data.items.length && (
          <p className="mt-2 text-xs text-muted">Ngày này có hơn 100 lịch hẹn; bảng chỉ hiện 100 lịch đầu.</p>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={date === today ? "Lịch hẹn hôm nay" : "Lịch hẹn"}
        description={`${formatFullDate(date)}, toàn cửa hàng`}
        actions={
          <div className="flex flex-wrap items-center gap-3 max-[640px]:w-full">
            <label htmlFor="appointment-date" className="sr-only">
              Chọn ngày
            </label>
            <div className="w-[180px] max-[640px]:flex-1">
              <Input
                id="appointment-date"
                type="date"
                prefixIcon="calendar"
                value={date}
                onChange={(event) => changeDate(event.target.value)}
              />
            </div>
            <ButtonLink href={ROUTES.bookForCustomer} variant="primary" className="max-[640px]:flex-1">
              <Icon name="calendar-plus" />
              Đặt lịch thay khách
            </ButtonLink>
          </div>
        }
      />
      {content}
    </>
  );
}
