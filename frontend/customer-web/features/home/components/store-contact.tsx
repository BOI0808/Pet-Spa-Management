import { Icon } from "@/components/icons";
import { STORE_INFO } from "@/lib/store-info";

const CONTACT_ITEMS = [
  { icon: "pin", text: STORE_INFO.address },
  { icon: "phone", text: `Hotline ${STORE_INFO.hotline}` },
  { icon: "clock", text: `Mở cửa ${STORE_INFO.openingHours} hằng ngày` },
] as const;

/** Vùng 7 – thông tin cửa hàng (tĩnh, UI-Screens G-16). */
export function StoreContact() {
  return (
    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-xs leading-4 text-muted">
      {CONTACT_ITEMS.map((item) => (
        <span key={item.icon} className="flex items-center gap-1.5">
          <Icon name={item.icon} className="size-4" />
          {item.text}
        </span>
      ))}
    </div>
  );
}
