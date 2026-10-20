// Để riêng (không có "use client") vì cả server component `site-header.tsx` và client component `header-nav.tsx` cùng dùng.

/**
 * Vòng focus trên nền Lagoon đậm của thanh trên: vòng mặc định (Lagoon mờ, `globals.css`) gần như không thấy
 * trên nền tối, nên dùng Apricot – màu nhấn của mục 6.1 – sát mép phần tử.
 */
export const onDarkFocusClass = "focus-visible:outline-apricot focus-visible:outline-offset-0";
