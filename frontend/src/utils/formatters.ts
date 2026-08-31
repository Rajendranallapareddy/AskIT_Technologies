export function formatDate(date?: string | Date | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date?: string | Date | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatCurrency(amount?: number | string | null) {
  if (amount === null || amount === undefined || amount === '') return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
}

export function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    OPEN: 'bg-green-100 text-green-700',
    ONGOING: 'bg-blue-100 text-blue-700',
    CLOSED: 'bg-gray-100 text-gray-700',
    COMPLETED: 'bg-navy-100 text-navy-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
    DRAFT: 'bg-yellow-100 text-yellow-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    AWAITING_PAYMENT: 'bg-orange-100 text-orange-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    ISSUED: 'bg-green-100 text-green-700',
    NEW: 'bg-orange-100 text-orange-700',
    REPLIED: 'bg-green-100 text-green-700',
    SUCCESS: 'bg-green-100 text-green-700',
    PAID: 'bg-green-100 text-green-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    UPCOMING: 'bg-sky-100 text-sky-700',
    DUE: 'bg-orange-100 text-orange-700',
    OVERDUE: 'bg-red-100 text-red-700',
    FAILED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-purple-100 text-purple-700',
    PARTIALLY_REFUNDED: 'bg-purple-100 text-purple-700',
    REQUESTED: 'bg-yellow-100 text-yellow-700',
    PROCESSED: 'bg-green-100 text-green-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export function formatMoney(amount?: number | null) {
  if (amount === null || amount === undefined) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
