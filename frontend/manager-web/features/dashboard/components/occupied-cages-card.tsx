import Link from "next/link";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Cage } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";
import { formatOccupantCheckOut } from "@/features/cages/cage-status";

/** Số chuồng hiện tối đa trong thẻ. */
const MAX_VISIBLE_CAGES = 6;

type OccupiedCagesCardProps = {
  /** Chuồng đang chứa thú cưng, đã sắp theo giờ trả; `undefined` khi chưa tải xong. */
  cages: Cage[] | undefined;
  isError: boolean;
  /** Hôm nay “YYYY-MM-DD” theo múi giờ cửa hàng. */
  today: string;
};

/** MW-02 vùng 5 – Chuồng đang chứa (FR-HTL-08): mã chuồng, tên thú cưng, giờ trả; “Xem tất cả” mở MW-07. */
export function OccupiedCagesCard({ cages, isError, today }: OccupiedCagesCardProps) {
  const visible = cages?.slice(0, MAX_VISIBLE_CAGES);
  const hiddenCount = cages ? cages.length - MAX_VISIBLE_CAGES : 0;

  return (
    <Card>
      <CardHeader title="Chuồng đang chứa">
        <Link href={ROUTES.cages} className="text-[13px] font-semibold text-lagoon-700 underline">
          Xem tất cả
        </Link>
      </CardHeader>
      <CardBody>
        {isError ? (
          <p className="text-muted">Chưa tải được danh sách. Thử tải lại trang.</p>
        ) : visible === undefined ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-muted">Chưa có thú cưng nào đang lưu trú.</p>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {visible.map((cage) =>
              cage.occupant ? (
                <li key={cage.cageId} className="flex items-center gap-3">
                  <PetAvatar species={cage.species} size="md" />
                  <span className="min-w-0">
                    <span className="block break-words font-semibold">
                      {cage.code}, {cage.occupant.petName}
                    </span>
                    <span className="block break-words text-xs leading-[18px] text-muted">
                      {formatOccupantCheckOut(cage.occupant.plannedCheckOut, today, "ngày ")}
                    </span>
                  </span>
                </li>
              ) : null,
            )}
          </ul>
        )}
        {hiddenCount > 0 && (
          <p className="mt-3 text-xs text-muted">
            Còn {hiddenCount} chuồng khác, xem ở{" "}
            <Link href={ROUTES.cages} className="font-semibold text-lagoon-700 underline">
              Chuồng &amp; giá
            </Link>
            .
          </p>
        )}
      </CardBody>
    </Card>
  );
}
