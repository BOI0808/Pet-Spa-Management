import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Phông Be Vietnam Pro cho toàn bộ giao diện, độ đậm 400/500/600/700 (mục 6.1).
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spa thú cưng – Web nhân viên",
  description: "Lễ tân và nhân viên spa: lịch hẹn, tiếp nhận, thực hiện dịch vụ, thanh toán tại quầy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
