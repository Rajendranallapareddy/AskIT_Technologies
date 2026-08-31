export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthenticatedUser {
  id: string;
  role: 'SUPER_ADMIN' | 'SUB_ADMIN' | 'TRAINER' | 'USER';
  email: string;
  fullName: string;
  isActive: boolean;
}
