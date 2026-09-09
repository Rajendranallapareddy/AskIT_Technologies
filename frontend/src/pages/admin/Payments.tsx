import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  GraduationCap,
  IndianRupee,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import {
  adminApi,
  adminPaymentApi,
} from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

type ViewMode =
  | 'courses'
  | 'students'
  | 'student';

type PaymentStatus =
  | 'SUCCESS'
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED'
  | string;

type Internship = {
  id: string;
  title: string;
  slug?: string;
  fee?: number | string | null;
  status?: string;
  startDate?: string;
  endDate?: string;
  registrations?: any[];
  _count?: {
    registrations?: number;
  };
};

type StudentRow = {
  registrationId: string;
  registrationNo?: string | null;
  registrationStatus?: string;
  userId: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  profilePicture?: string | null;
  appliedAt?: string;
};

const money = (
  value: unknown
) => {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }
  ).format(amount);
};

const dateTime = (
  value?: string | null
) => {
  if (!value) return '—';

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }
  ).format(date);
};

const initials = (
  name: string
) =>
  String(name || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
          ?.toUpperCase()
    )
    .join('');

const statusTheme = (
  status: PaymentStatus
) => {
  switch (status) {
    case 'SUCCESS':
      return {
        label: 'Paid',
        bg: '#ECFDF3',
        color: '#15803D',
        border: '#BBF7D0',
      };

    case 'PENDING_APPROVAL':
      return {
        label: 'Awaiting Approval',
        bg: '#FFF7ED',
        color: '#EA580C',
        border: '#FED7AA',
      };

    case 'FAILED':
      return {
        label: 'Failed',
        bg: '#FEF2F2',
        color: '#DC2626',
        border: '#FECACA',
      };

    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return {
        label:
          status ===
          'PARTIALLY_REFUNDED'
            ? 'Partially Refunded'
            : 'Refunded',
        bg: '#F5F3FF',
        color: '#7C3AED',
        border: '#DDD6FE',
      };

    case 'CANCELLED':
      return {
        label: 'Cancelled',
        bg: '#F8FAFC',
        color: '#64748B',
        border: '#CBD5E1',
      };

    default:
      return {
        label: 'Pending',
        bg: '#EFF6FF',
        color: '#2563EB',
        border: '#BFDBFE',
      };
  }
};

function StatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  const theme =
    statusTheme(status);

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
      style={{
        background:
          theme.bg,
        color:
          theme.color,
        borderColor:
          theme.border,
      }}
    >
      {theme.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
  helper,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background:
              `${accent}14`,
            color: accent,
          }}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
            {title}
          </p>

          <p className="mt-0.5 truncate text-xl font-bold text-navy-900">
            {value}
          </p>

          {helper && (
            <p className="mt-0.5 truncate text-[11px] text-navy-400">
              {helper}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const links =
    useAdminLinks();

  const toast =
    useToast();

  const [
    view,
    setView,
  ] =
    useState<ViewMode>(
      'courses'
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);

  const [
    internships,
    setInternships,
  ] =
    useState<
      Internship[]
    >([]);

  const [
    recentPayments,
    setRecentPayments,
  ] =
    useState<any[]>([]);

  const [
    analytics,
    setAnalytics,
  ] =
    useState<any>(
      null
    );

  const [
    selectedInternship,
    setSelectedInternship,
  ] =
    useState<
      Internship | null
    >(null);

  const [
    students,
    setStudents,
  ] =
    useState<
      StudentRow[]
    >([]);

  const [
    selectedStudent,
    setSelectedStudent,
  ] =
    useState<
      StudentRow | null
    >(null);

  const [
    studentHistory,
    setStudentHistory,
  ] =
    useState<any>(
      null
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    offlineOpen,
    setOfflineOpen,
  ] =
    useState(false);

  const loadDashboard =
    async (
      silent = false
    ) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [
          internshipResponse,
          paymentResponse,
          analyticsResponse,
        ] =
          await Promise.all([
            adminApi.internships({
              page: 1,
              limit: 100,
            }),

            adminPaymentApi.list({
              page: 1,
              limit: 12,
            }),

            adminPaymentApi.analytics(),
          ]);

        const courseData =
          Array.isArray(
            internshipResponse
              .data?.data
          )
            ? internshipResponse
                .data.data
            : [];

        const paymentData =
          Array.isArray(
            paymentResponse
              .data?.data
          )
            ? paymentResponse
                .data.data
            : [];

        setInternships(
          courseData
        );

        setRecentPayments(
          [...paymentData].sort(
            (
              a: any,
              b: any
            ) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          )
        );

        setAnalytics(
          analyticsResponse
            .data?.data ||
            null
        );
      } catch (err) {
        toast.error(
          getErrorMessage(
            err
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCourse =
    async (
      internship:
        Internship
    ) => {
      setSelectedInternship(
        internship
      );

      setSelectedStudent(
        null
      );

      setStudentHistory(
        null
      );

      setView(
        'students'
      );

      setDetailLoading(
        true
      );

      try {
        const response =
          await adminApi.registrations(
            internship.id,
            {
              page: 1,
              limit: 100,
            }
          );

        const rows =
          Array.isArray(
            response.data
              ?.data
          )
            ? response.data
                .data
            : [];

        const mapped:
          StudentRow[] =
          rows.map(
            (
              registration:
                any
            ) => {
              const user =
                registration
                  .user ||
                registration
                  .student ||
                {};

              return {
                registrationId:
                  registration.id,

                registrationNo:
                  registration
                    .registrationNo,

                registrationStatus:
                  registration
                    .status,

                userId:
                  registration
                    .userId ||
                  user.id,

                fullName:
                  user.fullName ||
                  user.name ||
                  'Student',

                email:
                  user.email ||
                  '—',

                mobileNumber:
                  user.mobileNumber,

                profilePicture:
                  user.profilePicture,

                appliedAt:
                  registration
                    .appliedAt,
              };
            }
          );

        mapped.sort(
          (
            a,
            b
          ) =>
            new Date(
              b.appliedAt || 0
            ).getTime() -
            new Date(
              a.appliedAt || 0
            ).getTime()
        );

        setStudents(
          mapped
        );
      } catch (err) {
        setStudents(
          []
        );

        toast.error(
          getErrorMessage(
            err
          )
        );
      } finally {
        setDetailLoading(
          false
        );
      }
    };

  const openStudent =
    async (
      student:
        StudentRow
    ) => {
      setSelectedStudent(
        student
      );

      setView(
        'student'
      );

      setDetailLoading(
        true
      );

      try {
        const response =
          await adminPaymentApi
            .studentHistory(
              student.userId
            );

        setStudentHistory(
          response.data
            ?.data ||
            null
        );
      } catch (err) {
        setStudentHistory(
          null
        );

        toast.error(
          getErrorMessage(
            err
          )
        );
      } finally {
        setDetailLoading(
          false
        );
      }
    };

  const filteredCourses =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return internships;
        }

        return internships
          .filter(
            (
              internship
            ) =>
              internship.title
                .toLowerCase()
                .includes(
                  query
                )
          );
      },
      [
        internships,
        search,
      ]
    );

  const filteredStudents =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return students;
        }

        return students
          .filter(
            (
              student
            ) =>
              [
                student.fullName,
                student.email,
                student.mobileNumber,
                student.registrationNo,
              ]
                .filter(Boolean)
                .some(
                  (
                    value
                  ) =>
                    String(
                      value
                    )
                      .toLowerCase()
                      .includes(
                        query
                      )
                )
          );
      },
      [
        students,
        search,
      ]
    );

  const coursePayments =
    useMemo(
      () => {
        if (
          !selectedInternship
        ) {
          return [];
        }

        return (
          studentHistory
            ?.payments ||
          []
        )
          .filter(
            (
              payment: any
            ) =>
              payment
                .internshipId ===
                selectedInternship
                  .id ||
              payment
                .internship
                ?.id ===
                selectedInternship
                  .id
          )
          .sort(
            (
              a: any,
              b: any
            ) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          );
      },
      [
        studentHistory,
        selectedInternship,
      ]
    );

  const coursePlan =
    useMemo(
      () => {
        if (
          !selectedInternship
        ) {
          return null;
        }

        return (
          studentHistory
            ?.plans ||
          []
        ).find(
          (
            plan: any
          ) =>
            plan
              .registration
              ?.internship
              ?.id ===
            selectedInternship.id
        ) || null;
      },
      [
        studentHistory,
        selectedInternship,
      ]
    );

  const studentPaymentSummary =
    useMemo(
      () => {
        const paid =
          coursePayments
            .filter(
              (
                payment:
                  any
              ) =>
                payment
                  .status ===
                'SUCCESS'
            )
            .reduce(
              (
                total:
                  number,
                payment:
                  any
              ) =>
                total +
                Number(
                  payment
                    .totalAmount ||
                    0
                ),
              0
            );

        const pending =
          coursePayments
            .filter(
              (
                payment:
                  any
              ) =>
                [
                  'PENDING',
                  'PENDING_APPROVAL',
                  'FAILED',
                ].includes(
                  payment
                    .status
                )
            )
            .reduce(
              (
                total:
                  number,
                payment:
                  any
              ) =>
                total +
                Number(
                  payment
                    .totalAmount ||
                    0
                ),
              0
            );

        const paidCount =
          coursePayments.filter(
            (
              payment:
                any
            ) =>
              payment.status ===
              'SUCCESS'
          ).length;

        const totalInstallments =
          Number(
            coursePlan
              ?.numberOfInstallments ||
              0
          );

        const remainingInstallments =
          totalInstallments
            ? Math.max(
                0,
                totalInstallments -
                  paidCount
              )
            : 0;

        return {
          paid,
          pending,
          paidCount,
          totalInstallments,
          remainingInstallments,
        };
      },
      [
        coursePayments,
        coursePlan,
      ]
    );

  const exportRecentCsv =
    () => {
      if (
        recentPayments.length ===
        0
      ) {
        toast.error(
          'No transactions to export'
        );
        return;
      }

      const rows = [
        [
          'Payment No',
          'Student',
          'Email',
          'Course',
          'Amount',
          'Status',
          'Method',
          'Created At',
        ],

        ...recentPayments.map(
          (
            payment:
              any
          ) => [
            payment.paymentNo ||
              '',
            payment.user
              ?.fullName ||
              '',
            payment.user
              ?.email ||
              '',
            payment.internship
              ?.title ||
              '',
            String(
              Number(
                payment
                  .totalAmount ||
                  0
              )
            ),
            payment.status ||
              '',
            payment.method ||
              payment.gateway ||
              '',
            payment.createdAt ||
              '',
          ]
        ),
      ];

      const csv =
        rows
          .map(
            (
              row
            ) =>
              row
                .map(
                  (
                    value
                  ) =>
                    `"${String(
                      value
                    ).replace(
                      /"/g,
                      '""'
                    )}"`
                )
                .join(',')
          )
          .join('\n');

      const blob =
        new Blob(
          [csv],
          {
            type:
              'text/csv;charset=utf-8;',
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          'a'
        );

      anchor.href =
        url;

      anchor.download =
        `askit-payments-${new Date()
          .toISOString()
          .slice(
            0,
            10
          )}.csv`;

      anchor.click();

      URL.revokeObjectURL(
        url
      );
    };

  const goBack =
    () => {
      setSearch('');

      if (
        view ===
        'student'
      ) {
        setView(
          'students'
        );

        setSelectedStudent(
          null
        );

        setStudentHistory(
          null
        );

        return;
      }

      setView(
        'courses'
      );

      setSelectedInternship(
        null
      );

      setStudents(
        []
      );
    };

  if (loading) {
    return (
      <DashboardLayout
        links={links}
        title="Admin Portal"
        pageTitle="Payments"
      >
        <LoadingSpinner
          label="Loading payment workspace…"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      links={links}
      title="Admin Portal"
      pageTitle="Payments"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-bold text-navy-900">
              Payment Management
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOfflineOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-orange-500 bg-orange-500 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Offline
            </button>

            <button
              type="button"
              onClick={() =>
                void loadDashboard(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={
                exportRecentCsv
              }
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-navy-200 bg-white px-3 text-xs font-semibold text-navy-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow"
            >
              <Download className="h-3.5 w-3.5" />
              Export Recent
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total Revenue"
            value={money(
              analytics
                ?.totalRevenue ||
                0
            )}
            icon={
              <IndianRupee className="h-5 w-5" />
            }
            accent="#16A34A"
          />

          <StatCard
            title="Successful"
            value={
              analytics
                ?.successCount ||
              0
            }
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            accent="#2563EB"
          />

          <StatCard
            title="Awaiting Approval"
            value={
              analytics
                ?.pendingApprovalCount ||
              0
            }
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
            accent="#F97316"
          />

          <StatCard
            title="Pending"
            value={
              analytics
                ?.pendingCount ||
              0
            }
            icon={
              <Clock3 className="h-5 w-5" />
            }
            accent="#D97706"
          />

          <StatCard
            title="Failed"
            value={
              analytics
                ?.failedCount ||
              0
            }
            icon={
              <XCircle className="h-5 w-5" />
            }
            accent="#DC2626"
          />
        </div>

        {view === 'courses' && (
          <>
            <section className="rounded-2xl border border-navy-100 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-navy-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-navy-900">
                    Recent Transactions
                  </p>
                  <p className="mt-0.5 text-xs text-navy-400">
                    Latest transactions are always shown first.
                  </p>
                </div>
                <span className="text-xs font-medium text-navy-400">
                  Showing latest {recentPayments.length}
                </span>
              </div>

              {recentPayments.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<Receipt className="h-8 w-8" />}
                    title="No transactions yet"
                    description="New payments will appear here automatically with the latest transaction first."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[950px] w-full">
                    <thead>
                      <tr className="border-b border-navy-100 bg-navy-50/40 text-left">
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Date</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Student</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Course</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Payment</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Amount</th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-navy-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.map((payment: any) => (
                        <tr key={payment.id} className="border-b border-navy-50 transition-colors hover:bg-blue-50/30">
                          <td className="px-4 py-3 text-xs text-navy-500">{dateTime(payment.createdAt)}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-navy-800">{payment.user?.fullName || '—'}</p>
                            <p className="text-[11px] text-navy-400">{payment.user?.email || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-navy-700">{payment.internship?.title || '—'}</td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-semibold text-navy-700">{payment.paymentNo || '—'}</p>
                            <p className="text-[11px] text-navy-400">
                              {payment.installmentIndex ? `Installment ${payment.installmentIndex}` : payment.method || payment.gateway || 'Payment'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-navy-900">{money(payment.totalAmount)}</td>
                          <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-navy-900">Courses</p>
                  <p className="mt-0.5 text-xs text-navy-400">
                    Select a course to see every registered student and their payment position.
                  </p>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search courses…"
                    className="input-field !pl-9"
                  />
                </div>
              </div>

              {filteredCourses.length === 0 ? (
                <EmptyState
                  icon={<GraduationCap className="h-8 w-8" />}
                  title="No courses found"
                  description="Courses with registrations will appear here."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCourses.map((internship) => {
                    const coursePaymentRows = recentPayments.filter((payment: any) =>
                      payment.internshipId === internship.id || payment.internship?.id === internship.id
                    );

                    const recentRevenue = coursePaymentRows
                      .filter((payment: any) => payment.status === 'SUCCESS')
                      .reduce((sum: number, payment: any) => sum + Number(payment.totalAmount || 0), 0);

                    return (
                      <button
                        key={internship.id}
                        type="button"
                        onClick={() => void openCourse(internship)}
                        className="group rounded-2xl border border-navy-100 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-navy-900">{internship.title}</p>
                              <p className="mt-0.5 text-[11px] text-navy-400">{internship.status || 'Course'}</p>
                            </div>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-navy-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-navy-50/60 p-2.5">
                            <p className="text-[10px] font-semibold uppercase text-navy-400">Registered</p>
                            <p className="mt-0.5 text-sm font-bold text-navy-800">
                              {internship._count?.registrations ?? internship.registrations?.length ?? 'View'}
                            </p>
                          </div>
                          <div className="rounded-xl bg-green-50/60 p-2.5">
                            <p className="text-[10px] font-semibold uppercase text-green-600">Recent paid</p>
                            <p className="mt-0.5 text-sm font-bold text-green-700">{money(recentRevenue)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {view === 'students' && selectedInternship && (
          <section className="rounded-2xl border border-navy-100 bg-white shadow-sm">
            <div className="border-b border-navy-100 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div>
                    <p className="font-bold text-navy-900">{selectedInternship.title}</p>
                    <p className="text-xs text-navy-400">Registered Students · {students.length}</p>
                  </div>
                </div>

                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student, email or registration no…"
                    className="input-field !pl-9"
                  />
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="p-10">
                <LoadingSpinner label="Loading registered students…" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-10">
                <EmptyState
                  icon={<Users className="h-8 w-8" />}
                  title="No registered students"
                  description="Students registered for this course will appear here."
                />
              </div>
            ) : (
              <div className="divide-y divide-navy-50">
                {filteredStudents.map((student, index) => (
                  <button
                    key={student.registrationId}
                    type="button"
                    onClick={() => void openStudent(student)}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50/40"
                  >
                    <span className="w-7 shrink-0 text-center text-xs font-semibold text-navy-300">{index + 1}</span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                      {initials(student.fullName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-800">{student.fullName}</p>
                      <p className="truncate text-[11px] text-navy-400">{student.email}</p>
                    </div>

                    <div className="hidden min-w-[150px] md:block">
                      <p className="text-[10px] font-semibold uppercase text-navy-300">Registration</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-navy-600">
                        {student.registrationNo || 'Pending number'}
                      </p>
                    </div>

                    <div className="hidden min-w-[130px] lg:block">
                      <p className="text-[10px] font-semibold uppercase text-navy-300">Registered</p>
                      <p className="mt-0.5 text-xs text-navy-600">{dateTime(student.appliedAt)}</p>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-navy-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {view === 'student' && selectedInternship && selectedStudent && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                    {initials(selectedStudent.fullName)}
                  </div>

                  <div>
                    <p className="font-bold text-navy-900">{selectedStudent.fullName}</p>
                    <p className="text-xs text-navy-400">
                      {selectedStudent.email} · {selectedInternship.title}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-navy-50/60 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase text-navy-300">Registration No</p>
                  <p className="text-xs font-bold text-navy-700">
                    {selectedStudent.registrationNo || 'Not assigned'}
                  </p>
                </div>
              </div>
            </section>

            {detailLoading ? (
              <div className="rounded-2xl border border-navy-100 bg-white p-10">
                <LoadingSpinner label="Loading complete payment history…" />
              </div>
            ) : !studentHistory ? (
              <div className="rounded-2xl border border-navy-100 bg-white p-10">
                <EmptyState
                  icon={<WalletCards className="h-8 w-8" />}
                  title="Payment details unavailable"
                  description="No payment information is available for this student."
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <StatCard
                    title="Paid Amount"
                    value={money(studentPaymentSummary.paid)}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    accent="#16A34A"
                  />
                  <StatCard
                    title="Pending Amount"
                    value={money(studentPaymentSummary.pending)}
                    icon={<Clock3 className="h-5 w-5" />}
                    accent="#F97316"
                  />
                  <StatCard
                    title="Paid Installments"
                    value={coursePlan ? `${studentPaymentSummary.paidCount}/${studentPaymentSummary.totalInstallments}` : studentPaymentSummary.paidCount}
                    icon={<CreditCard className="h-5 w-5" />}
                    accent="#2563EB"
                  />
                  <StatCard
                    title="Remaining"
                    value={coursePlan ? studentPaymentSummary.remainingInstallments : '—'}
                    helper={coursePlan ? 'installments' : 'No installment plan'}
                    icon={<CalendarDays className="h-5 w-5" />}
                    accent="#7C3AED"
                  />
                  <StatCard
                    title="Transactions"
                    value={coursePayments.length}
                    icon={<Receipt className="h-5 w-5" />}
                    accent="#0F766E"
                  />
                </div>

                {coursePlan && (
                  <section className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-bold text-navy-900">Installment Plan</p>
                        <p className="mt-0.5 text-xs text-navy-400">
                          {coursePlan.numberOfInstallments} installments · plan status {coursePlan.status}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-green-50 px-2.5 py-1.5 font-semibold text-green-700">
                          Paid {money(studentPaymentSummary.paid)}
                        </span>
                        <span className="rounded-lg bg-orange-50 px-2.5 py-1.5 font-semibold text-orange-700">
                          Remaining {money(Math.max(0, Number(coursePlan.totalAmount || 0) - studentPaymentSummary.paid))}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {[...(coursePlan.payments || [])]
                        .sort((a: any, b: any) => Number(a.installmentIndex || 0) - Number(b.installmentIndex || 0))
                        .map((payment: any) => (
                          <div key={payment.id} className="rounded-xl border border-navy-100 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-navy-800">
                                Installment {payment.installmentIndex || '—'}
                              </p>
                              <StatusBadge status={payment.status} />
                            </div>
                            <p className="mt-2 text-base font-bold text-navy-900">{money(payment.totalAmount)}</p>
                            <p className="mt-1 text-[11px] text-navy-400">Due: {dateTime(payment.dueDate)}</p>
                          </div>
                        ))}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-navy-100 bg-white shadow-sm">
                  <div className="border-b border-navy-100 px-4 py-4">
                    <p className="font-bold text-navy-900">Complete Payment History</p>
                    <p className="mt-0.5 text-xs text-navy-400">Most recent transaction appears first.</p>
                  </div>

                  {coursePayments.length === 0 ? (
                    <div className="p-10">
                      <EmptyState
                        icon={<Receipt className="h-8 w-8" />}
                        title="No payments for this course"
                        description="The student is registered, but no payment transaction has been recorded yet."
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] w-full">
                        <thead>
                          <tr className="border-b border-navy-100 bg-navy-50/40 text-left">
                            <th className="px-4 py-3 text-[11px] font-bold uppercase text-navy-400">Date</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase text-navy-400">Payment No</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase text-navy-400">Installment</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase text-navy-400">Amount</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase text-navy-400">Method</th>
                            <th className="px-4 py-3 text-[11px] font-bold uppercase text-navy-400">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {coursePayments.map((payment: any) => (
                            <tr key={payment.id} className="border-b border-navy-50 transition-colors hover:bg-blue-50/30">
                              <td className="px-4 py-3 text-xs text-navy-500">{dateTime(payment.paidAt || payment.createdAt)}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-navy-700">{payment.paymentNo || '—'}</td>
                              <td className="px-4 py-3 text-xs text-navy-600">
                                {payment.installmentIndex ? `#${payment.installmentIndex}` : 'Full Payment'}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-navy-900">{money(payment.totalAmount)}</td>
                              <td className="px-4 py-3 text-xs text-navy-600">{payment.method || payment.gateway || '—'}</td>
                              <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>

      <OfflinePaymentModal
        isOpen={offlineOpen}
        onClose={() => setOfflineOpen(false)}
        onSuccess={() => void loadDashboard(true)}
      />
    </DashboardLayout>
  );
}

function OfflinePaymentModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ userId: '', internshipId: '', amount: '', method: 'BANK_TRANSFER', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [internships, setInternships] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const toast = useToast();

  // Load the internship dropdown once, when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    adminApi.internships({ limit: 100 }).then((res) => setInternships(res.data.data)).catch(() => setInternships([]));
  }, [isOpen]);

  // Live-search students by name/email as the admin types — this is what
  // replaces the old "paste a raw user ID" field, which had no way to look
  // the ID up anywhere in the UI.
  useEffect(() => {
    if (!studentSearch.trim()) { setStudentResults([]); return; }
    setIsSearchingStudents(true);
    const timer = setTimeout(() => {
      adminApi.users({ search: studentSearch, role: 'USER', limit: 8 })
        .then((res) => setStudentResults(res.data.data))
        .catch(() => setStudentResults([]))
        .finally(() => setIsSearchingStudents(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  const pickStudent = (student: any) => {
    setSelectedStudent(student);
    setForm({ ...form, userId: student.id });
    setStudentSearch(`${student.fullName} (${student.email})`);
    setStudentResults([]);
  };

  const handleSubmit = async () => {
    if (!form.userId) return toast.error('Please select a student from the search results');
    if (!form.internshipId) return toast.error('Please select an internship');
    setIsSaving(true);
    try {
      const res = await adminPaymentApi.recordOffline({ ...form, amount: Number(form.amount) });
      toast.success(res.data.message || 'Offline payment recorded and registration confirmed');
      onSuccess();
      onClose();
      setForm({ userId: '', internshipId: '', amount: '', method: 'BANK_TRANSFER', notes: '' });
      setSelectedStudent(null);
      setStudentSearch('');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Offline Payment">
      <div className="space-y-4">
        <p className="text-xs text-navy-500">For cash or direct bank transfers collected outside the gateway. This immediately confirms the student's registration.</p>

        <div className="relative">
          <label className="label">Student</label>
          <input
            className="input-field"
            value={studentSearch}
            onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); setForm({ ...form, userId: '' }); }}
            placeholder="Type a name or email to search…"
          />
          {isSearchingStudents && <p className="text-xs text-navy-400 mt-1">Searching…</p>}
          {studentResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-navy-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {studentResults.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStudent(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-navy-50 border-b border-navy-50 last:border-0"
                >
                  <p className="font-semibold text-navy-800">{s.fullName}</p>
                  <p className="text-xs text-navy-400">{s.email}</p>
                </button>
              ))}
            </div>
          )}
          {selectedStudent && <p className="text-xs text-green-600 font-semibold mt-1">✓ Selected: {selectedStudent.fullName}</p>}
        </div>

        <div>
          <label className="label">Internship</label>
          <select className="input-field" value={form.internshipId} onChange={(e) => setForm({ ...form, internshipId: e.target.value })}>
            <option value="">Select internship…</option>
            {internships.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </div>

        <div><label className="label">Amount (₹)</label><input type="number" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div>
          <label className="label">Method</label>
          <select className="input-field" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OFFLINE">Cash</option>
            <option value="UPI">UPI (manual)</option>
          </select>
        </div>
        <div><label className="label">Notes</label><input className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <Button className="w-full" isLoading={isSaving} onClick={handleSubmit} disabled={!form.userId || !form.internshipId || !form.amount}>Confirm & Record Payment</Button>
      </div>
    </Modal>
  );
}
