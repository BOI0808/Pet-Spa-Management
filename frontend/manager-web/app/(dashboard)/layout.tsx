import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="ml-62 narrow:ml-0">
        <main className="mx-auto max-w-[1280px] px-8 pb-18 pt-7 narrow:px-4 narrow:pb-14 narrow:pt-5">
          {children}
        </main>
      </div>
    </>
  );
}