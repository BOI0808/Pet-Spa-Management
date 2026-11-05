import { Icon, type IconName } from "@/components/icons";
import { Card, CardHeader } from "@/components/ui/card";
import { STORE_INFO } from "@/lib/store-info";

// Tĩnh theo giá trị mặc định SA 7.2: khách không đọc được cấu hình của cửa hàng (UI-Screens G-03).
const BOOKING_NOTES: readonly { icon: IconName; title: string; body: string }[] = [
  {
    icon: "swap",
    title: "Đổi, hủy miễn phí trước giờ hẹn 60 phút",
    body: `Sau mốc này, vui lòng gọi hotline ${STORE_INFO.hotline} để cửa hàng hỗ trợ.`,
  },
  {
    icon: "hourglass",
    title: "Giữ chỗ tối đa 15 phút",
    body: "Quá 15 phút sau giờ hẹn mà bé chưa đến, lịch hẹn tự động hủy do vắng mặt. Vắng mặt quá 3 lần trong 30 ngày, tài khoản tạm khóa tự đặt lịch.",
  },
  {
    icon: "scale",
    title: "Cân lại khi tiếp nhận",
    body: "Nếu bé nặng hơn đáng kể và lên nhóm lớn hơn, bạn sẽ nhận yêu cầu xác nhận chi phí mới và có 30 phút để phản hồi.",
  },
  {
    icon: "wallet",
    title: "Thanh toán",
    body: "Spa: sau khi hoàn tất, tại quầy hoặc trực tuyến qua VNPAY, MoMo. Lưu trú: trả tiền tại quầy khi gửi bé.",
  },
];

const SIZE_RULE_COLUMNS = ["Loài", "Nhỏ", "Vừa", "Lớn"];

// Bảng mốc mặc định BR-19.
const SIZE_RULES: readonly (readonly [string, string, string | null, string])[] = [
  ["Chó (cân nặng)", "dưới 10 kg", "10 – dưới 25 kg", "từ 25 kg"],
  ["Chó (chiều cao vai)", "dưới 35 cm", "35 – dưới 55 cm", "từ 55 cm"],
  ["Mèo", "dưới 3 kg", "3 – dưới 5 kg", "từ 5 kg"],
  ["Thỏ", "dưới 1,5 kg", "1,5 – dưới 3 kg", "từ 3 kg"],
  ["Chuột lang", "dưới 1 kg", null, "từ 1 kg"],
];

const SIZE_CELL_CLASS = "border-t border-line-soft px-3.5 py-3";

/** Vùng 6 – lưu ý trước khi đặt lịch và bảng nhóm kích cỡ. */
export function BookingNotes() {
  return (
    <section className="min-w-0">
      <h2 className="mb-3">Trước khi đặt lịch</h2>
      <Card className="flex flex-col gap-4 p-5">
        {BOOKING_NOTES.map((note) => (
          <div key={note.title} className="flex items-start gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lagoon-50 text-lagoon-700">
              <Icon name={note.icon} />
            </span>
            <div className="min-w-0">
              <h3>{note.title}</h3>
              <p className="mt-1 text-xs leading-4 text-muted">{note.body}</p>
            </div>
          </div>
        ))}
      </Card>
      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Nhóm kích cỡ được xác định thế nào?" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {SIZE_RULE_COLUMNS.map((column) => (
                  <th key={column} className="bg-mist px-3.5 py-2.5 text-left text-xs font-semibold text-muted">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_RULES.map(([label, small, medium, large]) => (
                <tr key={label}>
                  <th scope="row" className={`${SIZE_CELL_CLASS} text-left font-normal`}>
                    {label}
                  </th>
                  <td className={SIZE_CELL_CLASS}>{small}</td>
                  <td className={`${SIZE_CELL_CLASS} ${medium ? "" : "text-muted"}`}>{medium ?? "không áp dụng"}</td>
                  <td className={SIZE_CELL_CLASS}>{large}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
