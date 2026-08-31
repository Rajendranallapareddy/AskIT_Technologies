export type Role = 'SUPER_ADMIN' | 'SUB_ADMIN' | 'TRAINER' | 'USER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  profilePicture?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  collegeName?: string | null;
  university?: string | null;
  degree?: string | null;
  branch?: string | null;
  graduationYear?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  createdAt?: string;
  subAdminPermissions?: {
    manageUsers: boolean;
    manageTrainers: boolean;
    manageCourses: boolean;
    manageInternships: boolean;
    manageRegistrations: boolean;
    manageAttendance: boolean;
    manageCertificates: boolean;
    manageAnnouncements: boolean;
    manageGallery: boolean;
    manageContactRequests: boolean;
    manageReports: boolean;
    viewAnalytics: boolean;
    managePayments: boolean;
    manageRefunds: boolean;
    manageCoupons: boolean;
  } | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  category: string;
  image?: string | null;
  description: string;
  duration: string;
  syllabus: string[];
  isActive: boolean;
}

export interface Trainer {
  id: string;
  userId: string;
  photo?: string | null;
  expertise: string[];
  experienceYears: number;
  bio?: string | null;
  user?: User;
  name?: string;
}

export interface Internship {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  totalSeats: number;
  seatsFilled: number;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';
  fee?: number | null;
  earlyBirdFee?: number | null;
  earlyBirdDeadline?: string | null;
  gstPercentage?: number;
  trainer?: Trainer;
  course?: Course;
}

export type RegistrationStatusType =
  | 'AWAITING_PAYMENT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDED';

export interface Registration {
  id: string;
  registrationNo?: string | null;
  status: RegistrationStatusType;
  appliedAt: string;
  requiresPayment?: boolean;
  internship: Internship;
  user?: User;
}

export type PaymentStatusType = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface Payment {
  id: string;
  paymentNo: string;
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: PaymentStatusType;
  method?: string | null;
  gateway: string;
  gatewayPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  internship: Internship;
  receipt?: { receiptNo: string; fileUrl?: string | null } | null;
  refunds?: Refund[];
  installmentPlanId?: string | null;
  installmentIndex?: number | null;
  dueDate?: string | null;
  failureReason?: string | null;
}

export interface Refund {
  id: string;
  refundNo: string;
  amount: number;
  type: 'FULL' | 'PARTIAL';
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  createdAt: string;
  payment?: Payment;
}

export interface Certificate {
  id: string;
  certificateNo: string;
  status: 'PENDING' | 'ISSUED' | 'REVOKED';
  issuedAt?: string | null;
  fileUrl?: string | null;
  internship: Internship;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: { total: number; page: number; limit: number; totalPages: number };
}
