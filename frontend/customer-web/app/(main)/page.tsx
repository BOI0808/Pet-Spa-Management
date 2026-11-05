import { HomeScreen } from "@/features/home/screens/home-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

export default function HomePage() {
  return <HomeScreen />;
}
