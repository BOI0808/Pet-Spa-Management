type AvatarProps = {
  /** Chữ cái đầu, ví dụ “MA”. */
  initials: string;
  /** md 32px (thanh trên), lg 56px (thẻ tóm tắt). */
  size?: "md" | "lg";
};

/** Vòng tròn chữ cái đầu nền Apricot nhạt (`.avatar` của ui-demo); chỉ trang trí, tên đã có chữ bên cạnh. */
export function Avatar({ initials, size = "md" }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-apricot-100 font-bold text-apricot-700 ${
        size === "lg" ? "size-14 text-lg" : "size-8 text-xs"
      }`}
    >
      {initials}
    </span>
  );
}
