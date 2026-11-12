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

/** Không có `sizeGroup` (hệ thống xác định – FR-PET-04); khách hàng không gửi `customerId`. */
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

// ── Danh mục dịch vụ ──
/** Giá là số nguyên VND. */
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

// ── Giá lưu trú ──
/** Giá lưu trú và giá thức ăn mỗi đêm của một loài và một nhóm kích cỡ (BR-22). Giá là số nguyên VND. */
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

// ── Đặt lịch spa ──
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

/** Không có nhân viên (BR-10), tiền, nhóm kích cỡ, trạng thái; khách hàng không gửi `customerId`. */
export type SpaBookingRequest = {
  petId: string;
  serviceIds: string[];
  /** ISO 8601 có độ lệch, ví dụ “2026-10-06T09:00:00+07:00”. */
  slotStart: string;
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
