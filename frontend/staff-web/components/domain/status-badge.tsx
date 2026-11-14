import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { AppointmentStatus, PaymentStatus } from "@/lib/api/types";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";

// Màu theo UI-Screens 2.4: InProgress và InStay cùng st-4.
const STATUS_TONE: Record<AppointmentStatus, BadgeTone> = {
  Pending: "st-1",
  Confirmed: "st-2",
  Received: "st-3",
  InProgress: "st-4",
  InStay: "st-4",
  Completed: "st-5",
  Cancelled: "st-6",
};

export function StatusBadge({ status, size }: { status: AppointmentStatus; size?: "md" | "lg" }) {
  return (
    <Badge tone={STATUS_TONE[status]} size={size}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={status === "Paid" ? "pay-1" : "pay-0"}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
