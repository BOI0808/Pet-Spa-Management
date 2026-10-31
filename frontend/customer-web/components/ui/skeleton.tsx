/** Khối xám nhạt có hiệu ứng lướt khi tải lần đầu (`.skeleton` trong ui-demo; SA 6.6 – không dùng spinner toàn trang). */
export function Skeleton({ className = "h-3.5" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-shimmer rounded-lg bg-[linear-gradient(90deg,#EAF1F2_0,#F5F9FA_50%,#EAF1F2_100%)] bg-size-[200%_100%] ${className}`}
    />
  );
}
