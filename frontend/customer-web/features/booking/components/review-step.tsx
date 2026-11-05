import type { ReactNode } from "react";
import { PetLine } from "@/components/domain/pet-line";
import { Alert } from "@/components/feedback/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { Pet } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { TEMPERAMENT_LABELS } from "@/lib/labels";
import { STORE_INFO } from "@/lib/store-info";
import { describePet } from "../spa-booking";

// Giờ hạn đổi/hủy, giữ chỗ phụ thuộc cấu hình mà khách không đọc được, tạm dùng câu chung (UI-Screens CW-06 vùng 8, G-03).
const BOOKING_NOTES = [
  "Bạn có thể tự đổi hoặc hủy miễn phí trong thời hạn cửa hàng cho phép trước giờ hẹn.",
  "Cửa hàng giữ chỗ trong thời gian ngắn sau giờ hẹn. Sau đó, lịch tự động hủy do vắng mặt.",
  "Bé được cân lại khi tiếp nhận. Nếu lên nhóm lớn hơn, bạn cần xác nhận chi phí mới.",
  "Thanh toán sau khi hoàn tất, tại quầy hoặc trực tuyến.",
];

/** Vùng 9 – hiện khi `POST /appointments/spa` trả 403 `BOOKING_LOCKED` (UI-Screens G-04). */
export function BookingLockedAlert() {
  return (
    <Alert tone="danger" icon="lock" title="Tài khoản tạm thời không thể tự đặt lịch">
      Bạn đã vắng mặt quá 3 lần trong 30 ngày gần đây. Vui lòng liên hệ cửa hàng qua hotline <b>{STORE_INFO.hotline}</b>{" "}
      để được hỗ trợ đặt lịch.
    </Alert>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children}</dd>
    </>
  );
}

type ReviewCardProps = {
  pet: Pet;
  serviceNames: string;
  timeRange: string;
  staffRequired: number;
  total: number;
};

/** Vùng 7 – kiểm tra lại trước khi gửi. */
export function BookingReviewCard({ pet, serviceNames, timeRange, staffRequired, total }: ReviewCardProps) {
  const temperament = TEMPERAMENT_LABELS[pet.temperament].toLocaleLowerCase("vi-VN");
  return (
    <Card>
      <CardHeader title="Kiểm tra lại lịch hẹn" />
      <CardBody>
        <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-2.5 max-[640px]:grid-cols-[96px_minmax(0,1fr)]">
          <Row label="Thú cưng">
            <PetLine species={pet.species} name={pet.name} meta={`${describePet(pet)}, ${temperament}`} size="sm" />
          </Row>
          <Row label="Dịch vụ">{serviceNames}</Row>
          <Row label="Thời gian">{timeRange}</Row>
          <Row label="Nhân viên">Cần {staffRequired} nhân viên, cửa hàng xếp khi xác nhận</Row>
          <Row label="Tạm tính">
            <span className="tabular-nums">{formatMoney(total)}</span>
          </Row>
        </dl>
      </CardBody>
    </Card>
  );
}

/** Vùng 8 – lưu ý cho lịch. */
export function BookingNotesCard() {
  return (
    <Card>
      <CardHeader title="Lưu ý cho lịch này" />
      <CardBody>
        <ul className="list-disc pl-[18px] leading-relaxed">
          {BOOKING_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
