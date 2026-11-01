// Kiểu dữ liệu chép đúng backend/docs/api/openapi.yaml (phần phiên đăng nhập và danh mục dịch vụ).

export type Role = "Customer" | "Staff" | "Manager";
type StaffRole = "Receptionist" | "SpaStaff";
export type Species = "Dog" | "Cat" | "Rabbit" | "GuineaPig";
export type SizeGroup = "Small" | "Medium" | "Large";

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

// ── Danh mục dịch vụ (FR-SVC) ──

/** Giá, thời lượng, số nhân viên của một dịch vụ cho một loài và một nhóm kích cỡ. Giá là số nguyên VND. */
export type PricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  price: number;
  durationMinutes: number;
  staffRequired: 1 | 2;
};

/** GET /services – Quản lý nhận cả dịch vụ đã ngừng (`isActive = false`). */
export type Service = {
  serviceId: string;
  name: string;
  description?: string | null;
  /** Mốc giờ bắt đầu muộn nhất, dạng HH:mm. */
  latestStartTime: string;
  isActive: boolean;
  pricing: PricingRow[];
};

/** Body của POST /services và PUT /services/{id}. */
export type ServiceRequest = {
  name: string;
  description?: string;
  latestStartTime: string;
  pricing: PricingRow[];
};

export type ServiceCreated = { serviceId: string };

/** Body của PATCH /services/{id}/status. */
export type ActiveToggleRequest = { isActive: boolean };
