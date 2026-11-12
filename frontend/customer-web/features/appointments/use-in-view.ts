"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bật `true` lần đầu phần tử vào gần khung nhìn, rồi giữ nguyên. Dùng để chỉ tải dữ liệu phụ của từng thẻ
 * (chi tiết, thanh toán) khi thẻ hiện ra (UI-Screens CW-11, G-05).
 */
export function useInViewOnce<Element extends HTMLElement>(rootMargin = "200px") {
  const ref = useRef<Element>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView] as const;
}
