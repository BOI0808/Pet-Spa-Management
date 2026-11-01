"use client";

import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { Service } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SPECIES_LABELS, SPECIES_ORDER } from "@/lib/labels";
import { useSetServiceStatus } from "@/lib/queries/services";

export const cellClass = "border-b border-line-soft px-3.5 py-3 align-middle";

type ServiceRowProps = {
  service: Service;
  onEdit: () => void;
  onStop: () => void;
};

/** Một dòng của bảng MW-06 (vùng 2). Dịch vụ đã ngừng hiển thị mờ, thao tác “Mở lại” không cần hộp thoại. */
export function ServiceRow({ service, onEdit, onStop }: ServiceRowProps) {
  const { showSuccess, showError } = useToast();
  const setStatus = useSetServiceStatus();

  // Chỉ hiện các loài có dòng giá, đúng thứ tự Chó, Mèo, Thỏ, Chuột lang (backend không bảo đảm thứ tự này).
  const species = SPECIES_ORDER.filter((item) => service.pricing.some((row) => row.species === item));
  const lowestPrice = service.pricing.length > 0 ? Math.min(...service.pricing.map((row) => row.price)) : null;

  function handleReopen() {
    setStatus.mutate(
      { serviceId: service.serviceId, isActive: true },
      {
        onSuccess: () => showSuccess(`Đã mở lại ${service.name}`),
        onError: (error) => showError(error),
      },
    );
  }

  return (
    // Rê chuột đổi nền cả dòng: `.table tbody tr:hover td` của ui-demo.
    <tr className={`[&:hover>td]:bg-[#F8FBFB] ${service.isActive ? "" : "opacity-70"}`}>
      <td className={cellClass}>
        <div className="font-semibold">{service.name}</div>
        {service.description && <div className="text-xs text-muted">{service.description}</div>}
      </td>
      <td className={cellClass}>
        <div className="flex gap-1">
          {species.map((item) => (
            <PetAvatar key={item} species={item} size="sm" />
          ))}
        </div>
        <span className="sr-only">{species.map((item) => SPECIES_LABELS[item]).join(", ")}</span>
      </td>
      <td className={`${cellClass} whitespace-nowrap text-right tabular-nums max-[980px]:text-left`}>
        {lowestPrice === null ? "—" : formatMoney(lowestPrice)}
      </td>
      <td className={`${cellClass} whitespace-nowrap tabular-nums`}>{service.latestStartTime}</td>
      <td className={cellClass}>
        <Tag tone={service.isActive ? "ok" : "default"}>{service.isActive ? "Đang cung cấp" : "Đã ngừng"}</Tag>
      </td>
      <td className={`${cellClass} whitespace-nowrap text-right`}>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Icon name="edit" />
          Sửa
        </Button>
        {service.isActive ? (
          <Button variant="ghost" size="sm" onClick={onStop}>
            Ngừng
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleReopen} loading={setStatus.isPending}>
            Mở lại
          </Button>
        )}
      </td>
    </tr>
  );
}
