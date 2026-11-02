import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Cage } from "@/lib/api/types";
import { CageRow } from "./cage-row";
import { InfoNote } from "./info-note";

const headCellClass =
  "whitespace-nowrap border-b border-line bg-mist px-3.5 py-2.5 text-left text-xs font-semibold leading-4 text-muted";

type CagesTabProps = {
  /** Chuồng đã thêm hoặc sửa trong phiên làm việc này (chưa có GET /cages để đọc toàn bộ chuồng). */
  cages: Cage[];
  onAdd: () => void;
  onEdit: (cage: Cage) => void;
  onChanged: (cage: Cage) => void;
};

/**
 * Tab Chuồng của MW-07 – UI-Screens.md (FR-HTL-01, FR-HTL-02). Mới có vùng 4 (bảng) ở dạng rút gọn:
 * bảng chỉ liệt kê chuồng vừa thêm/sửa vì GET /cages (FR-HTL-08) do thẻ 88 làm ở backend; vùng 3 (4 thẻ số liệu),
 * cột “Đang chứa”, trạng thái Trống/Đang chứa và tổng số chuồng trên tab do thẻ 150 bổ sung khi nối GET /cages.
 */
export function CagesTab({ cages, onAdd, onEdit, onChanged }: CagesTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <InfoNote>
        Danh sách tạm thời chỉ hiện chuồng bạn thêm hoặc sửa trong lần mở trang này. Tình trạng trống / đang chứa của toàn bộ chuồng
        sẽ có ở bản cập nhật sau.
      </InfoNote>

      <Card>
        {cages.length === 0 ? (
          <EmptyState
            icon="grid"
            title="Chưa có chuồng nào trong lần mở trang này"
            description="Thêm chuồng mới để tính vào sức chứa lưu trú."
            action={
              <Button variant="secondary" onClick={onAdd}>
                <Icon name="plus" />
                Thêm chuồng
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={headCellClass}>Mã</th>
                  <th className={headCellClass}>Loài</th>
                  <th className={headCellClass}>Nhóm</th>
                  <th className={headCellClass}>Tình trạng</th>
                  <th className={`${headCellClass} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {cages.map((cage) => (
                  <CageRow key={cage.cageId} cage={cage} onEdit={() => onEdit(cage)} onChanged={onChanged} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
