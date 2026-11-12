"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

const pad = (value: number) => String(value).padStart(2, "0");

/** 1692 → “28:12”; từ 1 giờ trở lên → “1:05:00”. */
export function formatCountdown(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

/**
 * Số giây còn lại tới `expiresAt` của backend, so với giờ máy (Frontend-Architecture 8).
 * Về 0 thì gọi `onExpire` một lần để tải lại dữ liệu; web không tự đổi trạng thái lịch (SA 6.6).
 */
export function useCountdown(expiresAt: string, onExpire?: () => void) {
  const deadline = Date.parse(expiresAt);
  const [now, setNow] = useState(() => Date.now());
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    // `expiresAt` không đọc được, hoặc đã hết hạn từ khi mở màn (dữ liệu vừa tải đã là mới nhất):
    // không chạy đồng hồ, không gọi lại để tránh vòng lặp tải.
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        window.clearInterval(timer);
        onExpireRef.current?.();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}

type CountdownProps = { expiresAt: string; onExpire?: () => void; plain?: boolean };

/** `.countdown` của ui-demo: viên nền Ink, đồng hồ + mm:ss. `plain` chỉ in số (trong câu chữ của thẻ cảnh báo). */
export function Countdown({ expiresAt, onExpire, plain = false }: CountdownProps) {
  const seconds = useCountdown(expiresAt, onExpire);
  const text = formatCountdown(seconds);
  if (plain) return <span className="tabular-nums">{text}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink py-[3px] pl-2 pr-2.5 text-[13px] font-bold leading-[18px] text-white tabular-nums">
      <Icon name="timer" className="size-3.5" />
      {text}
    </span>
  );
}
