// Kiểu dữ liệu chép đúng backend/docs/api/openapi.yaml (phần phiên đăng nhập).
import type { StaffRole } from "@/lib/staff-role";

export type Role = "Customer" | "Staff" | "Manager";

/** GET /me */
export type Me = {
  userId: string;
  userName: string;
  role: Role;
  staffRole?: StaffRole | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type LoginRequest = {
  userName: string;
  password: string;
};

/** Phản hồi của POST /auth/login và POST /auth/refresh. */
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

// Hai kiểu dưới đây là phản hồi của route handler `app/api/session/*` của web, không phải schema của openapi.yaml.
export type SessionLoginResponse = {
  accessToken: string;
  me: Me;
};

export type SessionRefreshResponse = {
  accessToken: string;
};

// ── Kiểu dùng chung ──
export type Species = "Dog" | "Cat" | "Rabbit" | "GuineaPig";
export type SizeGroup = "Small" | "Medium" | "Large";
export type Temperament = "Calm" | "Normal" | "Difficult";

export type PageInfo = { page: number; pageSize: number; total: number };
export type Page<T> = PageInfo & { items: T[] };

// ── Khách hàng (SW-04) ──
/** GET /customers – lễ tân tìm theo một phần số điện thoại. */
export type Customer = {
  customerId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  isBookingLocked: boolean;
};

export type CustomerPage = Page<Customer>;

/** Body của POST /customers/walk-in. */
export type WalkInRequest = { fullName: string; phone: string };

export type WalkInCreated = { customerId: string };

// ── Thú cưng (SW-05) – giống customer-web ──
export type Pet = {
  petId: string;
  customerId: string;
  name: string;
  species: Species;
  breed: string;
  temperament: Temperament;
  weightKg: number;
  heightCm?: number | null;
  coatNote?: string | null;
  notes?: string | null;
  sizeGroup: SizeGroup;
  isActive: boolean;
};

export type PetPage = Page<Pet>;

/** Không có `sizeGroup` (hệ thống xác định – FR-PET-04); lễ tân bắt buộc gửi `customerId` khi tạo. */
export type PetRequest = {
  name: string;
  species: Species;
  breed: string;
  temperament?: Temperament;
  weightKg: number;
  /** Bắt buộc khi species = Dog. */
  heightCm?: number;
  coatNote?: string;
  notes?: string;
  customerId?: string;
};

export type PetSizeResult = {
  /** Chỉ có ở phản hồi tạo hồ sơ. */
  petId?: string;
  sizeGroup: SizeGroup;
};
