import { ProfileScreen } from "@/features/profile/screens/profile-screen";

// Màn nằm sau SessionGate – xem ghi chú trong app/(main)/layout.tsx.
export const instant = false;

export default function ProfilePage() {
  return <ProfileScreen />;
}
