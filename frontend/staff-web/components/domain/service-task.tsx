import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

type ServiceTaskProps = {
  name: string;
  /** Thời lượng, hoặc “Xong lúc HH:mm…” khi đã xong. */
  detail?: ReactNode;
  /** Giá hoặc nút bên phải. */
  aside?: ReactNode;
  done: boolean;
};

/** Một dòng dịch vụ có vòng tick (`.svc-task` của ui-demo); đã xong thì nền xanh nhạt, tick xanh. */
export function ServiceTask({ name, detail, aside, done }: ServiceTaskProps) {
  return (
    <li
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 rounded-2xl border p-4 ${
        done ? "border-[#c9e5d3] bg-[#f6fbf8]" : "border-line bg-white"
      }`}
    >
      <span
        className={`grid size-7 place-items-center rounded-full border-[1.5px] text-white ${
          done ? "border-success bg-success" : "border-[#9db3b8] bg-white"
        }`}
      >
        {done && <Icon name="check" className="size-4" />}
        <span className="sr-only">{done ? "Đã xong" : "Chưa xong"}</span>
      </span>
      <div className="min-w-0">
        <div className="break-words font-semibold">{name}</div>
        {detail && <div className="break-words text-xs leading-[18px] text-muted">{detail}</div>}
      </div>
      {aside}
    </li>
  );
}
