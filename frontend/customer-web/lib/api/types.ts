// Kiểu request/response chép đúng tên và kiểu schema trong openapi.yaml (Frontend-Architecture 7.2).
// Trường nullable → `T | null`; trường không bắt buộc → `?`. Chỉ khai báo schema web khách hàng đang dùng.

export type Role = "Customer" | "Staff" | "Manager";
export type StaffRole = "Receptionist" | "SpaStaff";
export type Species = "Dog" | "Cat" | "Rabbit" | "GuineaPig";
export type SizeGroup = "Small" | "Medium" | "Large";
export type Temperament = "Calm" | "Normal" | "Difficult";

export type PageInfo = { page: number; pageSize: number; total: number };
export type Page<T> = PageInfo & { items: T[] };

// ── Xác thực & tài khoản ──
export type RegisterRequest = { userName: string; fullName: string; password: string; email?: string };
export type RegisterResponse = { userId: string };
export type LoginRequest = { userName: string; password: string };
export type TokenPair = { accessToken: string; refreshToken: string };
export type RefreshRequest = { refreshToken: string };

export type Me = {
  userId: string;
  /** Số điện thoại. */
  userName: string;
  role: Role;
  /** Chỉ có khi role = Staff. */
  staffRole?: StaffRole | null;
  fullName?: string | null;
  /** Khách hàng: Customer.Phone (= userName). */
  phone?: string | null;
  email?: string | null;
};

export type UpdateMeRequest = { fullName?: string; phone?: string; email?: string };

// ── Thú cưng ──
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
