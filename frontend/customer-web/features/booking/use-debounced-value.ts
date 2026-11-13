import { useEffect, useState } from "react";

/** Giá trị chỉ đổi sau khi `value` đứng yên `delayMs` mili giây (kiểm tra còn chỗ trễ 400ms – UI-Screens CW-07). */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
