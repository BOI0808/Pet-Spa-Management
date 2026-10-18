import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

// Màn đầu tiên sau đăng nhập của cả lễ tân và nhân viên spa là SW-02 Lịch hẹn (logo trên thanh trên cũng dẫn về đây).
export default function HomePage() {
  redirect(ROUTES.appointments);
}
