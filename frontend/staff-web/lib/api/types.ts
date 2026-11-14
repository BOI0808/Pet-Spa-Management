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

// ── Danh mục dịch vụ (SW-14, SW-06) – giống customer-web ──
/** Giá, thời lượng, số nhân viên của một dịch vụ theo loài và nhóm kích cỡ (BR-11, BR-12). Giá là số nguyên VND. */
export type PricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  price: number;
  durationMinutes: number;
  staffRequired: number;
};

export type Service = {
  serviceId: string;
  name: string;
  description?: string | null;
  /** “HH:mm”. */
  latestStartTime: string;
  isActive: boolean;
  pricing: PricingRow[];
};

// ── Giá lưu trú (SW-06) ──
export type HotelPricingRow = {
  species: Species;
  sizeGroup: SizeGroup;
  pricePerNight: number;
  foodPerNight: number;
};

export type HotelPricing = {
  pricing: HotelPricingRow[];
  /** Phí phạt mỗi lần trả muộn, VND (BR-22). */
  lateFeePerBlock: number;
};

// ── Đặt lịch spa (SW-06) ──
export type SlotGroup = "Morning" | "Afternoon" | "Evening";
export type SlotStatus = "Available" | "Full" | "NotAccepted";
export type AppointmentType = "Spa" | "Hotel";
export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Received"
  | "InProgress"
  | "InStay"
  | "Completed"
  | "Cancelled";

export type SlotInfo = {
  /** “HH:mm”. */
  time: string;
  group: SlotGroup;
  status: SlotStatus;
};

export type SpaSlots = {
  durationMinutes: number;
  staffRequired: number;
  bufferMinutes: number;
  slots: SlotInfo[];
};

/** Không có nhân viên (BR-10), tiền, trạng thái. Lễ tân đặt thay bắt buộc gửi `customerId` (khác customer-web). */
export type SpaBookingRequest = {
  petId: string;
  serviceIds: string[];
  /** ISO 8601 có độ lệch, ví dụ “2026-10-06T09:00:00+07:00”. */
  slotStart: string;
  customerId: string;
};

export type SpaBookingCreated = {
  appointmentId: string;
  type?: AppointmentType;
  status: AppointmentStatus;
  sizeGroup?: SizeGroup;
  slotStart?: string;
  slotEnd: string;
  staffRequired: number;
  /** VND. */
  estimatedAmount: number;
};

// ── Đặt lịch lưu trú (SW-06) ──
export type HotelAvailability = {
  /** Còn ít nhất một chuồng hợp loài, nhóm kích cỡ, trống trong cả các đêm (BR-21). */
  available: boolean;
  nights: number;
  /** Tiền lưu trú tạm tính, VND (BR-22). */
  estimatedAmount: number;
};

/** Lễ tân đặt thay bắt buộc gửi `customerId`. */
export type HotelBookingRequest = {
  petId: string;
  /** ISO 8601 có độ lệch, ví dụ “2026-10-16T09:00:00+07:00”. */
  plannedCheckIn: string;
  plannedCheckOut: string;
  customerId: string;
};

export type HotelBookingCreated = {
  appointmentId: string;
  status: AppointmentStatus;
  nights: number;
  /** VND. */
  estimatedAmount: number;
};

// ── Lịch hẹn: danh sách, chi tiết ──
export type CancelReason =
  | "CustomerCancelled"
  | "StoreUnable"
  | "CustomerBeyondDeadline"
  | "NoShow"
  | "CostNotConfirmed";

/** Thời điểm là ISO 8601 có độ lệch. Trường của loại lịch kia là null. */
export type Appointment = {
  appointmentId: string;
  type: AppointmentType;
  customerId: string;
  petId: string;
  customerName?: string;
  petName?: string;
  status: AppointmentStatus;
  /** Có giá trị ⇔ status = Cancelled. */
  cancelReason?: CancelReason | null;
  cancelledAt?: string | null;
  sizeGroup: SizeGroup;
  actualWeightKg?: number | null;
  /** Chỉ lịch Spa. */
  slotStart?: string | null;
  slotEnd?: string | null;
  staffRequired?: number | null;
  /** Chỉ lịch Hotel. */
  plannedCheckIn?: string | null;
  plannedCheckOut?: string | null;
  actualCheckOut?: string | null;
  cageId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentPage = Page<Appointment>;

export type AppointmentServiceItem = {
  serviceId: string;
  name?: string;
  isDone: boolean;
  doneAt?: string | null;
  note?: string | null;
};

export type AppointmentStaffItem = {
  staffId: string;
  fullName?: string;
  isHolding: boolean;
  assignedAt?: string;
};

export type CostConfirmationStatus = "Pending" | "Accepted" | "Rejected" | "Expired";

export type CostConfirmation = {
  actualWeightKg: number;
  newSizeGroup: SizeGroup;
  /** VND. */
  oldAmount: number;
  newAmount: number;
  status: CostConfirmationStatus;
  createdAt?: string;
  expiresAt: string;
  respondedAt?: string | null;
};

export type AppointmentDetail = Appointment & {
  /** Chỉ lịch Spa. */
  services?: AppointmentServiceItem[];
  /** Chỉ lịch Spa; rỗng khi chưa xác nhận. */
  staff?: AppointmentStaffItem[];
  /** Yêu cầu xác nhận chi phí đang Pending (tối đa một mỗi lịch). */
  pendingCostConfirmation?: CostConfirmation | null;
};

// ── Thanh toán ──
export type PaymentKind = "Spa" | "Stay" | "LateFee";
export type PaymentStatus = "Unpaid" | "Paid";
export type PaymentMethod = "Cash" | "BankQR" | "Online";

export type Payment = {
  paymentId: string;
  appointmentId: string;
  kind: PaymentKind;
  /** Số tiền phải trả (VND), do hệ thống tính. */
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  receivedAmount?: number | null;
  paidAt?: string | null;
};
