"use client";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { Cage } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { useSetCageStatus } from "@/lib/queries/cages";

export const cellClass = "border-b border-line-soft px-3.5 py-3 align-middle";

type CageRowProps = {
  cage: Cage;
  onEdit: () => void;
  /** Gọi khi backend đã đổi trạng thái xong, kèm chuồng sau khi đổi. */
  onChanged: (cage: Cage) => void;
};

/**
 * Một dòng của bảng chuồng MW-07 (vùng 4). Chuồng đã ngừng hiển thị mờ; “Ngừng sử dụng” và “Mở lại” không cần hộp thoại (UI-Screens MW-07).
 * Chưa có dữ liệu đang chứa (GET /cages thuộc thẻ 150) nên chưa ẩn nút “Ngừng sử dụng” ở chuồng đang có thú cưng.
 */
export function CageRow({ cage, onEdit, onChanged }: CageRowProps) {
  const { showSuccess, showError } = useToast();
  const setStatus = useSetCageStatus();

  function handleSetActive(isActive: boolean) {
    setStatus.mutate(
      { cageId: cage.cageId, isActive },
      {
        onSuccess: () => {
          showSuccess(isActive ? `Đã mở lại chuồng ${cage.code}` : `Đã ngừng sử dụng chuồng ${cage.code}`);
          onChanged({ ...cage, isActive });
        },
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
        <Tag tone={cage.isActive ? "ok" : "default"}>{cage.isActive ? "Đang sử dụng" : "Ngừng sử dụng"}</Tag>
      </td>
      <td className={`${cellClass} whitespace-nowrap text-right`}>
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={setStatus.isPending}>
          Sửa
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleSetActive(!cage.isActive)} loading={setStatus.isPending}>
          {cage.isActive ? "Ngừng sử dụng" : "Mở lại"}
        </Button>
      </td>
    </tr>
  );
}
