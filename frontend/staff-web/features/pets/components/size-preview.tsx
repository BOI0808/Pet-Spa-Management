import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import type { Species } from "@/lib/api/types";
import { formatDecimal } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { parseDecimal } from "@/lib/validation";
import { estimateSizeGroup, type SizeCriterionResult } from "../size-estimate";

function KeyValue({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-[7px]">
      <span className="text-muted">{label}</span>
      <span className={`text-right ${strong ? "font-semibold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function criterionLabel(prefix: string, result: SizeCriterionResult) {
  return `${prefix} ${formatDecimal(result.value)} ${result.unit}`;
}

function missingDataHint(species: Species | "") {
  if (species === "") return "Chọn loài và nhập cân nặng để xem nhóm dự kiến.";
  return species === "Dog"
    ? "Nhập cân nặng và chiều cao để xem nhóm dự kiến."
    : "Nhập cân nặng để xem nhóm dự kiến.";
}

type SizePreviewProps = { species: Species | ""; weightKg: string; heightCm: string };

/** CW-05 vùng 7 – Nhóm kích cỡ dự kiến, tính lại theo giá trị đang nhập (xem size-estimate.ts). */
export function SizePreview({ species, weightKg, heightCm }: SizePreviewProps) {
  const estimate = estimateSizeGroup(species, parseDecimal(weightKg), parseDecimal(heightCm));

  return (
    <Card className="p-5">
      <h3 className="font-medium text-muted">Nhóm kích cỡ dự kiến</h3>
      {estimate && species !== "" ? (
        <>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[30px] font-bold leading-9">{SIZE_GROUP_LABELS[estimate.group]}</span>
            <Tag tone="size">{SPECIES_LABELS[species]}</Tag>
          </div>
          <div className="mt-3 text-xs">
            <KeyValue label={criterionLabel("Theo cân nặng", estimate.byWeight)} value={estimate.byWeight.description} />
            {estimate.byHeight && (
              <>
                <KeyValue label={criterionLabel("Theo chiều cao", estimate.byHeight)} value={estimate.byHeight.description} />
                <div className="mt-1 border-t border-dashed border-line pt-1">
                  <KeyValue label="Lấy nhóm cao hơn" value={SIZE_GROUP_LABELS[estimate.group]} strong />
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 text-[30px] font-bold leading-9 text-muted">Chưa đủ dữ liệu</div>
          <p className="mt-3 text-xs text-muted">{missingDataHint(species)}</p>
        </>
      )}
      <p className="mt-3 text-xs text-muted">
        Nhóm chính thức do hệ thống xác định khi lưu, dùng để tính giá, thời lượng và chọn chuồng.
      </p>
    </Card>
  );
}
