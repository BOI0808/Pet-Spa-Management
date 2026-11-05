import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { getShortName } from "@/lib/format";
import { useMe } from "@/lib/queries/me";
import { ROUTES } from "@/lib/routes";

/** Vùng 1. Thẻ “Đang diễn ra” (vùng 2) cần API lịch hẹn, thêm vào đây khi backend có `GET /appointments`. */
export function HomeHero() {
  // SessionGate đã tải GET /me trước khi hiện màn.
  const { data: me } = useMe({ enabled: false });
  const fullName = me?.fullName;

  return (
    <section className="relative overflow-hidden rounded-[22px] bg-lagoon px-9 py-8 text-white max-[640px]:px-5 max-[640px]:py-6">
      <span aria-hidden="true" className="absolute -right-[60px] -top-[120px] size-[300px] rounded-full bg-white/[.07]" />
      <span aria-hidden="true" className="absolute -bottom-[60px] left-[42%] size-[120px] rounded-full bg-apricot/20" />
      <div className="relative z-10">
        <div className="font-medium text-[#BDE3E6]">Chào {fullName ? getShortName(fullName) : "bạn"}</div>
        <h1 className="mt-1 text-[30px] leading-[38px] max-[640px]:text-2xl max-[640px]:leading-8">
          Bé cần tắm, cắt tỉa hay ở lại vài đêm?
        </h1>
        <p className="mt-2 max-w-[440px] text-[15px] leading-6 text-[#CBEAEC]">
          Chọn dịch vụ theo loài và kích cỡ của bé, xem giá ngay, chọn giờ còn trống. Cửa hàng xác nhận và xếp nhân viên
          cho bạn.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href={ROUTES.spaBooking} variant="hero" size="lg">
            <Icon name="droplet" />
            Đặt lịch spa
          </ButtonLink>
          <ButtonLink href={ROUTES.hotelBooking} variant="hero-ghost" size="lg">
            <Icon name="bed" />
            Đặt lưu trú
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
