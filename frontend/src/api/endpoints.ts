import { apiClient } from './client';

// --- Auth --------------------------------------------------------------
export const authApi = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  verifyEmail: (token: string) => apiClient.post('/auth/verify-email', { token }),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => apiClient.post('/auth/reset-password', { token, password }),
  updateProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('picture', file);
    return apiClient.put('/auth/profile-picture', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// --- Public --------------------------------------------------------------
export const publicApi = {
  stats: () => apiClient.get('/public/stats'),
  courses: () => apiClient.get('/public/courses'),
  testimonials: () => apiClient.get('/public/testimonials'),
  gallery: () => apiClient.get('/public/gallery'),
  internships: (params?: any) => apiClient.get('/public/internships', { params }),
  internship: (slug: string) => apiClient.get(`/public/internships/${slug}`),
  trainers: () => apiClient.get('/public/trainers'),
  verifyCertificate: (no: string) => apiClient.get(`/public/certificates/verify/${no}`),
  contact: (data: any) => apiClient.post('/public/contact', data),
};

// --- User (student) --------------------------------------------------------------
export const userApi = {
  dashboard: () => apiClient.get('/users/dashboard'),
  profile: () => apiClient.get('/users/profile'),
  updateProfile: (data: any) => apiClient.put('/users/profile', data),
  changePassword: (data: any) => apiClient.put('/users/change-password', data),
  history: () => apiClient.get('/users/history'),
  notifications: () => apiClient.get('/users/notifications'),
  markNotificationRead: (id: string) => apiClient.put(`/users/notifications/${id}/read`),
  registerForInternship: (internshipId: string) => apiClient.post('/users/internships/register', { internshipId }),
  cancelRegistration: (id: string) => apiClient.put(`/users/registrations/${id}/cancel`),
  attendance: () => apiClient.get('/users/attendance'),
  certificates: () => apiClient.get('/users/certificates'),
  downloadCertificate: (id: string) => apiClient.get(`/users/certificates/${id}/download`,{ responseType: 'blob', }),  
  materials: () => apiClient.get('/users/materials'),
  sessions: () => apiClient.get('/users/sessions'),
};

// --- Trainer --------------------------------------------------------------
export const trainerApi = {
  dashboard: () => apiClient.get('/trainer/dashboard'),
  participants: (internshipId: string) => apiClient.get(`/trainer/internships/${internshipId}/participants`),
  sessions: (internshipId: string) => apiClient.get(`/trainer/internships/${internshipId}/sessions`),
  createSession: (internshipId: string, data: any) => apiClient.post(`/trainer/internships/${internshipId}/sessions`, data),
  updateSession: (id: string, data: any) => apiClient.put(`/trainer/sessions/${id}`, data),
  markAttendance: (sessionId: string, records: any[]) => apiClient.post(`/trainer/sessions/${sessionId}/mark`, { records }),
  postAnnouncement: (internshipId: string, data: any) => apiClient.post(`/trainer/internships/${internshipId}/announcements`, data),
};

// --- Admin / Super Admin --------------------------------------------------------------
export const adminApi = {
  dashboard: () => apiClient.get('/admin/dashboard'),
  users: (params?: any) => apiClient.get('/admin/users', { params }),
  userDetail: (id: string) => apiClient.get(`/admin/users/${id}`),
  createUser: (data: any) => apiClient.post('/admin/users', data),
  updateUser: (id: string, data: any) => apiClient.put(`/admin/users/${id}`, data),
  activateUser: (id: string) => apiClient.put(`/admin/users/${id}/activate`),
  deactivateUser: (id: string) => apiClient.put(`/admin/users/${id}/deactivate`),
  resetUserPassword: (id: string, newPassword: string) => apiClient.put(`/admin/users/${id}/reset-password`, { newPassword }),
  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`),

  internships: (params?: any) => apiClient.get('/admin/internships', { params }),
  createInternship: (data: any) => apiClient.post('/admin/internships', data),
  updateInternship: (id: string, data: any) => apiClient.put(`/admin/internships/${id}`, data),
  deleteInternship: (id: string) => apiClient.delete(`/admin/internships/${id}`),

  registrations: (internshipId: string, params?: any) =>
    apiClient.get(`/admin/internships/${internshipId}/registrations`, { params }),
  approveRegistration: (id: string) => apiClient.put(`/admin/registrations/${id}/approve`),
  rejectRegistration: (id: string) => apiClient.put(`/admin/registrations/${id}/reject`),
  removeRegistration: (id: string) => apiClient.delete(`/admin/registrations/${id}`),

  trainers: () => apiClient.get('/admin/trainers'),
  trainerDetail: (id: string) => apiClient.get(`/admin/trainers/${id}`),
  createTrainer: (data: any) => apiClient.post('/admin/trainers', data),
  updateTrainer: (id: string, data: any) => apiClient.put(`/admin/trainers/${id}`, data),
  deleteTrainer: (id: string) => apiClient.delete(`/admin/trainers/${id}`),
  assignTrainer: (internshipId: string, trainerId: string | null) =>
    apiClient.put('/admin/trainers/assign', { internshipId, trainerId }),
  trainerPerformance: (id: string) => apiClient.get(`/admin/trainers/${id}/performance`),

  certificates: () => apiClient.get('/admin/certificates'),
  generateCertificate: (userId: string, internshipId: string) =>
    apiClient.post('/admin/certificates/generate', { userId, internshipId }),
  issueCertificate: (id: string) => apiClient.put(`/admin/certificates/${id}/issue`),

  announcements: () => apiClient.get('/admin/announcements'),
  createAnnouncement: (data: any) => apiClient.post('/admin/announcements', data),
  updateAnnouncement: (id: string, data: any) => apiClient.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => apiClient.delete(`/admin/announcements/${id}`),

  contacts: (params?: any) => apiClient.get('/admin/contacts', { params }), replyToContact: ( id: string, message: string ) => apiClient.post( `/admin/contacts/${id}/reply`, { message } ), 
  updateContact: ( id: string, status: string ) => apiClient.put( `/admin/contacts/${id}`, { status } ),

  courses: () => apiClient.get('/public/courses'),
  createCourse: (data: any) => apiClient.post('/admin/courses', data),
};

// --- Payments (student-facing checkout) --------------------------------
export const paymentApi = {
  createOrder: (data: { internshipId: string; couponCode?: string; idempotencyKey: string; installments?: number; paymentMethod?: 'ONLINE' | 'MANUAL' }) =>
    apiClient.post('/payments/create-order', data),
  verify: (data: { paymentId: string; gatewayOrderId: string; gatewayPaymentId: string; gatewaySignature: string; method?: string }) =>
    apiClient.post('/payments/verify', data),
  reportFailure: (paymentId: string, reason: string) => apiClient.post('/payments/failure', { paymentId, reason }),
  history: () => apiClient.get('/payments/history'),
  myRefunds: () => apiClient.get('/payments/refunds'),
  get: (id: string) => apiClient.get(`/payments/${id}`),
  downloadReceipt: (paymentId: string) => apiClient.get(`/payments/receipts/${paymentId}/download`),
  requestRefund: (paymentId: string, reason: string) => apiClient.post(`/payments/${paymentId}/refund-request`, { reason }),
  verifyReceipt: (token: string) => apiClient.get(`/payments/verify-receipt/${token}`),
  validateCoupon: (internshipId: string, couponCode?: string) => apiClient.post('/public/coupons/validate', { internshipId, couponCode: couponCode || undefined }),

  myInstallmentPlans: () => apiClient.get('/payments/installments/my'),
  payInstallment: (paymentId: string) => apiClient.post(`/payments/installments/${paymentId}/pay`),

  manualAccounts: () => apiClient.get('/payments/manual-accounts'),
  switchToManual: (paymentId: string) => apiClient.put(`/payments/${paymentId}/switch-to-manual`),
  submitReference: (paymentId: string, reference: string) => apiClient.post(`/payments/${paymentId}/submit-reference`, { reference }),
};

// --- Admin: Payments, Refunds, Coupons, Payment Settings ----------------
export const adminPaymentApi = {
  list: (params?: any) => apiClient.get('/admin/payments', { params }),
  detail: (id: string) => apiClient.get(`/admin/payments/${id}`),
  exportUrl: (params: Record<string, string>) => `/api/admin/payments/export?${new URLSearchParams(params).toString()}`,
  analytics: () => apiClient.get('/admin/payments/analytics'),
  recordOffline: (data: any) => apiClient.post('/admin/payments/offline', data),
  settlePending: (paymentId: string, data: { method?: string; notes?: string }) => apiClient.post('/admin/payments/offline', { paymentId, ...data }),
  resendReceipt: (id: string) => apiClient.post(`/admin/payments/${id}/resend-receipt`),
  approve: (id: string) => apiClient.post(`/admin/payments/${id}/approve`),
  reject: (id: string, reason: string) => apiClient.post(`/admin/payments/${id}/reject`, { reason }),
  updateDueDate: (id: string, dueDate: string) => apiClient.patch(`/admin/payments/${id}/due-date`, { dueDate }),
  studentHistory: (userId: string) => apiClient.get(`/admin/payments/student/${userId}`),

  updateInternshipPricing: (id: string, data: any) => apiClient.put(`/admin/internships/${id}/pricing`, data),

  refunds: (params?: any) => apiClient.get('/admin/refunds', { params }),
  createRefund: (data: any) => apiClient.post('/admin/refunds', data),
  approveRefund: (id: string) => apiClient.put(`/admin/refunds/${id}/approve`),
  rejectRefund: (id: string, reason?: string) => apiClient.put(`/admin/refunds/${id}/reject`, { reason }),

  coupons: () => apiClient.get('/admin/coupons'),
  createCoupon: (data: any) => apiClient.post('/admin/coupons', data),
  updateCoupon: (id: string, data: any) => apiClient.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id: string) => apiClient.delete(`/admin/coupons/${id}`),

  getSettings: () => apiClient.get('/admin/payment-settings'),
  updateSettings: (data: any) => apiClient.put('/admin/payment-settings', data),
};

// --- Super Admin: Payment Accounts (bank/UPI/gateway secrets) -----------
export const paymentAccountApi = {
  list: () => apiClient.get('/superadmin/payment-accounts'),
  create: (data: any, qrFile?: File | null) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) formData.append(k, String(v)); });
    if (qrFile) formData.append('qrCode', qrFile);
    return apiClient.post('/superadmin/payment-accounts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  update: (id: string, data: any, qrFile?: File | null) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) formData.append(k, String(v)); });
    if (qrFile) formData.append('qrCode', qrFile);
    return apiClient.put(`/superadmin/payment-accounts/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  toggle: (id: string) => apiClient.put(`/superadmin/payment-accounts/${id}/toggle`),
  remove: (id: string) => apiClient.delete(`/superadmin/payment-accounts/${id}`),
};

// --- Notifications (bell — works for any authenticated role) ------------
export const notificationApi = {
  list: (params?: { page?: number; limit?: number }) => apiClient.get('/notifications', { params }),
  unreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/read-all'),
  pushPublicKey: () => apiClient.get('/notifications/push/public-key'),
  pushSubscribe: (subscription: PushSubscriptionJSON) => apiClient.post('/notifications/push/subscribe', { subscription }),
  pushUnsubscribe: (endpoint: string) => apiClient.post('/notifications/push/unsubscribe', { endpoint }),
};

export const superAdminApi = {
  updateOwnProfile: (data: any) => apiClient.put('/superadmin/profile', data),
  subAdmins: () => apiClient.get('/superadmin/sub-admins'),
  createSubAdmin: (data: any) => apiClient.post('/superadmin/sub-admins', data),
  updatePermissions: (id: string, permissions: any) => apiClient.put(`/superadmin/sub-admins/${id}/permissions`, permissions),
  deactivateSubAdmin: (id: string) => apiClient.put(`/superadmin/sub-admins/${id}/deactivate`),
  activateSubAdmin: (id: string) => apiClient.put(`/superadmin/sub-admins/${id}/activate`),
  deleteSubAdmin: (id: string) => apiClient.delete(`/superadmin/sub-admins/${id}`),
  resetSubAdminPassword: (id: string, newPassword: string) => apiClient.put(`/superadmin/sub-admins/${id}/reset-password`, { newPassword }),
  activityLogs: (params?: any) => apiClient.get('/superadmin/activity-logs', { params }),
};
