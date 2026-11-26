"use client";

// SW-08 Tình trạng chuồng – UI-Screens.md, UC-33, FR-HTL-08, BR-21 (thẻ 127). Chỉ lễ tân; chỉ xem, không có thao tác
// ghi ngoài lối sang SW-10.
import { useState } from "react";
import { SpeciesIllustration } from "@/components/domain/pet-avatar";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { SizeGroup, Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SIZE_GROUP_ORDER, SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { useAppointments } from "@/lib/queries/appointments";
import { useCages } from "@/lib/queries/cages";
import { getStoreToday } from "@/lib/time";
import {
  countCages,
  filterCages,
  findStayAppointment,
  IN_STAY_PARAMS,
  isDueForCheckOut,
  NO_CAGE_FILTERS,
  sortByCode,
  type CageFilters,
} from "../cages";
import { CageCard } from "../components/cage-card";

type StateFilter = "all" | "free" | "busy";

const STATE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "free", label: "Trống" },
  { value: "busy", label: "Đang chứa" },
] as const;

/** “11 chuồng đang sử dụng: 3 đang chứa, 8 trống. 1 chuồng ngừng sử dụng.” (vùng 1, đếm ở web). */
function summaryText(counts: ReturnType<typeof countCages>) {
  const off = counts.off > 0 ? ` ${counts.off} chuồng ngừng sử dụng.` : "";
  return `${counts.inUse} chuồng đang sử dụng: ${counts.busy} đang chứa, ${counts.free} trống.${off}`;
}

function GridSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Đang tải tình trạng chuồng" className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <li key={index}>
          <Skeleton className="h-[168px] rounded-2xl" />
        </li>
      ))}
    </ul>
  );
}

/** `/chuong`. */
export function CagesScreen() {
  const today = getStoreToday();
  const cages = useCages({ live: true });
  // Chỉ để có `appointmentId` cho nút “Trả thú cưng” (G-17); lỗi thì thẻ chuồng vẫn hiện, chỉ thiếu nút.
  const stays = useAppointments(IN_STAY_PARAMS);
  const [filters, setFilters] = useState<CageFilters>(NO_CAGE_FILTERS);

  const all = cages.data ? sortByCode(cages.data.items) : [];
  const shown = filterCages(all, filters);

  let content;
  if (cages.isPending) {
    content = <GridSkeleton />;
  } else if (cages.isError) {
    content = (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={cages.error} className="w-full" />
        <Button onClick={() => void cages.refetch()}>Thử lại</Button>
      </div>
    );
  } else if (all.length === 0) {
    content = (
      <Card>
        <EmptyState title="Cửa hàng chưa có chuồng nào." description="Quản lý thêm chuồng ở Web Quản lý." icon="grid" />
      </Card>
    );
  } else if (shown.length === 0) {
    content = (
      <Card>
        <EmptyState
          title="Không có chuồng nào khớp bộ lọc."
          icon="grid"
          action={
            <Button size="sm" onClick={() => setFilters(NO_CAGE_FILTERS)}>
              Bỏ lọc
            </Button>
          }
        />
      </Card>
    );
  } else {
    content = (
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
        {shown.map((cage) => (
          <CageCard
            key={cage.cageId}
            cage={cage}
            today={today}
            dueToday={isDueForCheckOut(cage, today)}
            stayAppointmentId={
              (cage.occupant && findStayAppointment(stays.data?.items, cage.occupant.petId)?.appointmentId) ?? null
            }
          />
        ))}
      </ul>
    );
  }

  return (
    <>
      <PageHeader title="Tình trạng chuồng" description={cages.data ? summaryText(countCages(all)) : undefined} />

      {/* Vùng 2 – bộ lọc, lọc ở web. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Lọc theo loài" className="flex flex-wrap gap-2">
          <FilterChip
            active={filters.species === null}
            onClick={() => setFilters((current) => ({ ...current, species: null }))}
          >
            Tất cả loài
          </FilterChip>
          {SPECIES_ORDER.map((species: Species) => (
            <FilterChip
              key={species}
              active={filters.species === species}
              onClick={() => setFilters((current) => ({ ...current, species }))}
            >
              <SpeciesIllustration species={species} className="size-4" />
              {SPECIES_LABELS[species]}
            </FilterChip>
          ))}
        </div>
        <label className="sr-only" htmlFor="cage-size-group">
          Nhóm kích cỡ
        </label>
        <select
          id="cage-size-group"
          value={filters.sizeGroup ?? ""}
          onChange={(event) =>
            setFilters((current) => ({ ...current, sizeGroup: (event.target.value || null) as SizeGroup | null }))
          }
          className="h-[34px] w-[170px] cursor-pointer rounded-xl border border-line bg-white px-3 text-[13px] text-ink hover:border-[#a9c6cb] max-[640px]:w-full"
        >
          <option value="">Mọi nhóm kích cỡ</option>
          {SIZE_GROUP_ORDER.map((group) => (
            <option key={group} value={group}>
              {SIZE_GROUP_LABELS[group]}
            </option>
          ))}
        </select>
        <SegmentedControl<StateFilter>
          label="Lọc theo tình trạng"
          options={STATE_OPTIONS}
          value={filters.state ?? "all"}
          onChange={(value) => setFilters((current) => ({ ...current, state: value === "all" ? null : value }))}
          className="ml-auto max-[640px]:ml-0 max-[640px]:w-full"
        />
      </div>

      {content}
    </>
  );
}
