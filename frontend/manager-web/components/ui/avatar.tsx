type AvatarTone = "apricot" | "teal" | "muted";

// `.avatar`, `.avatar.teal` của ui-demo; `muted` là màu xám của dòng nhân viên đã vô hiệu hóa (MW-08). Chỉ khai báo tông đang dùng.
const TONE_CLASS: Record<AvatarTone, string> = {
  apricot: "bg-apricot-100 text-apricot-700",
  teal: "bg-lagoon-50 text-lagoon-700",
  muted: "bg-[#E5ECEE] text-[#8FA2A7]",
};

/** Vòng tròn 32px chứa chữ cái đầu; chỉ trang trí, tên đã có chữ bên cạnh. */
export function Avatar({ initials, tone = "apricot" }: { initials: string; tone?: AvatarTone }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${TONE_CLASS[tone]}`}
    >
      {initials}
    </span>
  );
}
