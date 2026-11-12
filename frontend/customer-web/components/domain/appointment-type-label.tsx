import { Icon } from "@/components/icons";
import type { AppointmentType } from "@/lib/api/types";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/labels";

/** Biểu tượng + “Spa” / “Lưu trú” (`.type-spa`, `.type-hotel` của ui-demo). */
export function AppointmentTypeLabel({ type }: { type: AppointmentType }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium">
      <Icon
        name={type === "Spa" ? "droplet" : "bed"}
        className={`size-4 ${type === "Spa" ? "text-lagoon" : "text-[#6a5bc4]"}`}
      />
      {APPOINTMENT_TYPE_LABELS[type]}
    </span>
  );
}
