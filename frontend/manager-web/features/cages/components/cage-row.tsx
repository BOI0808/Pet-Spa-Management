"use client";

import { PetAvatar } from "@/components/domain/pet-avatar";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { Cage } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useSetCageStatus } from "@/lib/queries/cages";
import { formatOccupantCheckOut, getCageStatus, type CageStatusKind } from "../cage-status";

export const cellClass = "border-b border-line-soft px-3.5 py-3 align-middle";

const STATUS_TAG: Record<CageStatusKind, { tone: "ok" | "busy" | "default"; label: string }> = {
  free: { tone: "ok", label: "Trống" },
  occupied: { tone: "busy", label: "Đang chứa" },
  inactive: { tone: "default", label: "Ngừng sử dụng" },
};

type CageRowProps = {
  cage: Cage;
  /** Hôm nay “YYYY-MM-DD” theo múi giờ cửa hàng, để ghi “hôm nay” ở giờ trả. */
  today: string;
  onEdit: () => void;
};

/**
 * Một dòng của bảng chuồng MW-07 (vùng 4). Chuồng đã ngừng hiển thị mờ; “Ngừng sử dụng” và “Mở lại” không cần hộp thoại (UI-Screens MW-07).
 * Chuồng đang chứa thú cưng không có nút “Ngừng sử dụng” (FR-HTL-02): backend không chặn nên giao diện là chỗ chặn duy nhất.
 */
export function CageRow({ cage, today, onEdit }: CageRowProps) {
  const { showSuccess, showError } = useToast();
  const setStatus = useSetCageStatus();
  const status = getCageStatus(cage);
  const tag = STATUS_TAG[status];
  const occupant = cage.occupant;

  function handleSetActive(isActive: boolean) {
    setStatus.mutate(
      { cageId: cage.cageId, isActive },
      {
        onSuccess: () => showSuccess(isActive ? `Đã mở lại chuồng ${cage.code}` : `Đã ngừng sử dụng chuồng ${cage.code}`),
        onError: (error) => showError(error),
      },
    );
  }

  return (
    // Rê chuột đổi nền cả dòng: `.table tbody tr:hover td` của ui-demo.
    <tr className={`[&:hover>td]:bg-[#F8FBFB] ${cage.isActive ? "" : "opacity-70"}`}>
      <td className={`${cellClass} font-bold`}>{cage.code}</td>
      <td className={cellClass}>{SPECIES_LABELS[cage.species]}</td>
      <td className={cellClass}>{SIZE_GROUP_LABELS[cage.sizeGroup]}</td>
      <td className={cellClass}>
        <Tag tone={tag.tone}>{tag.label}</Tag>
      </td>
      <td className={cellClass}>
        {occupant ? (
          <div className="flex items-center gap-2.5">
            {/* Chuồng nuôi đúng loài (BR-21) nên loài của thú cưng chính là loài của chuồng. */}
            <PetAvatar species={cage.species} size="sm" />
            <div className="min-w-0 leading-[18px]">
              <div className="break-words font-semibold">{occupant.petName}</div>
              <div className="break-words text-xs text-muted">
                Chủ: {occupant.customerName}. {formatOccupantCheckOut(occupant.plannedCheckOut, today)}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-muted">–</span>
        )}
      </td>
      <td className={`${cellClass} whitespace-nowrap text-right`}>
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={setStatus.isPending}>
          Sửa
        </Button>
        {status === "free" && (
          <Button variant="ghost" size="sm" onClick={() => handleSetActive(false)} loading={setStatus.isPending}>
            Ngừng sử dụng
          </Button>
        )}
        {!cage.isActive && (
          <Button variant="ghost" size="sm" onClick={() => handleSetActive(true)} loading={setStatus.isPending}>
            Mở lại
          </Button>
        )}
      </td>
    </tr>
  );
}
