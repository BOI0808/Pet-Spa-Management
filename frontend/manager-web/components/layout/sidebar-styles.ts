// Để riêng (không có "use client") vì cả server component `sidebar.tsx` và client component `sidebar-nav.tsx` cùng dùng.

/**
 * Vòng focus trên nền Lagoon 800 của thanh bên: vòng mặc định (Lagoon mờ, `globals.css`) gần như không thấy
 * trên nền tối, nên dùng Apricot (Design-System 2.1 – màu trên nền tối) sát mép phần tử, như web nhân viên.
 */
export const onDarkFocusClass = "focus-visible:outline-apricot focus-visible:outline-offset-0";
