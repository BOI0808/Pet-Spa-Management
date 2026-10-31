import type { ReactNode } from "react";
import { PetAvatar } from "@/components/domain/pet-avatar";
import type { Species } from "@/lib/api/types";
import { BrandMark } from "./site-header";

type AuthLayoutProps = {
  /** Câu lớn của khối giới thiệu. */
  title: string;
  description: string;
  /** Hình thú cưng dưới khối giới thiệu, theo thứ tự hiển thị. */
  species: Species[];
  children: ReactNode;
};

/**
 * Màn đăng nhập, đăng ký không có khung (UI-Screens 2.1; `.auth` của ui-demo):
 * khối giới thiệu nền Lagoon bên trái + form trắng rộng tối đa 400px; dưới 980px chỉ còn form.
 */
export function AuthLayout({ title, description, species, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] max-[980px]:grid-cols-1">
      <div className="relative flex flex-col overflow-hidden bg-lagoon px-14 py-12 text-white max-[980px]:hidden">
        <span className="absolute -right-20 -top-20 size-[360px] rounded-full bg-white/6" />
        <span className="absolute right-[60px] top-[120px] size-40 rounded-full bg-apricot/18" />
        <div className="relative flex items-center gap-2.5 whitespace-nowrap text-base font-bold">
          <BrandMark inverted />
          <span>
            Spa thú cưng
            <small className="block text-[11px] font-medium leading-[14px] text-[#A9D9DC]">
              Chăm sóc và lưu trú cho chó, mèo, thỏ, chuột lang
            </small>
          </span>
        </div>
        <h2 className="relative mt-auto max-w-[460px] text-[34px] font-bold leading-[42px] tracking-[-0.02em]">{title}</h2>
        <p className="relative mt-3.5 max-w-[420px] text-[15px] leading-6 text-[#C9E9EB]">{description}</p>
        <div className="relative mt-8 flex gap-3">
          {species.map((item) => (
            <PetAvatar key={item} species={item} size="lg" className="shadow-[0_0_0_4px_rgba(255,255,255,0.12)]" />
          ))}
        </div>
      </div>
      <main className="flex items-center justify-center bg-white px-8 py-12 max-[640px]:px-4">
        <div className="w-full max-w-[400px] [&_h1]:text-[26px] [&_h1]:leading-[34px]">{children}</div>
      </main>
    </div>
  );
}
