import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, GraduationCap, Calendar, Clock, Ban, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate, formatDateTime, initials } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { getImageUrl } from '../../utils/imageUrl';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-navy-50 last:border-0">
      <span className="text-sm text-navy-500">{label}</span>
      <span className="text-sm font-semibold text-navy-800 text-right">{value ?? '—'}</span>
    </div>
  );
}

// Everything a student entered while creating their account (and building
// out their profile), minus the two things nobody but the student should
// ever need — their internal user ID and their password. Also surfaces
// what they've done on the platform since: registrations, attendance,
// certificates — since a Super Admin looking someone up usually wants both
// "who is this" and "what have they been up to" in one place.
export default function UsersStudentDetail() {
  const { id } = useParams();
  const links = useAdminLinks();
  const navigate = useNavigate();
  const toast = useToast();
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    setStudent(null);
    setError(null);
    adminApi.userDetail(id).then((res) => setStudent(res.data.data)).catch((err) => setError(getErrorMessage(err)));
  };
  useEffect(load, [id]);

  const handleToggle = async () => {
    if (!student) return;
    try {
      if (student.isActive) await adminApi.deactivateUser(student.id);
      else await adminApi.activateUser(student.id);
      toast.success(`${student.fullName} ${student.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Student Details">
      <button onClick={() => navigate('/admin/users/students')} className="flex items-center gap-1.5 text-sm font-semibold text-navy-500 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !student ? (
        <LoadingSpinner />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="card p-6 h-fit">
            <div className="flex flex-col items-center text-center">
              {student.profilePicture ? (
                <img src={getImageUrl(student.profilePicture) ?? undefined} alt={student.fullName} className="w-20 h-20 rounded-full object-cover"/>
              ) : (
                <div className="w-20 h-20 rounded-full bg-navy-700 text-white flex items-center justify-center text-xl font-bold">
                  {initials(student.fullName)}
                </div>
              )}
              <h2 className="mt-4 text-lg font-bold text-navy-900">{student.fullName}</h2>
              <span className={`mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {student.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="mt-5 space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5 text-navy-600"><Mail className="w-4 h-4 text-navy-400 shrink-0" /> <span className="truncate">{student.email}</span></div>
              <div className="flex items-center gap-2.5 text-navy-600"><Phone className="w-4 h-4 text-navy-400 shrink-0" /> {student.mobileNumber}</div>
              {(student.city || student.state || student.country) && (
                <div className="flex items-center gap-2.5 text-navy-600">
                  <MapPin className="w-4 h-4 text-navy-400 shrink-0" /> {[student.city, student.state, student.country].filter(Boolean).join(', ')}
                </div>
              )}
              <div className="flex items-center gap-2.5 text-navy-600"><Calendar className="w-4 h-4 text-navy-400 shrink-0" /> Joined {formatDate(student.createdAt)}</div>
              {student.lastLoginAt && (
                <div className="flex items-center gap-2.5 text-navy-600"><Clock className="w-4 h-4 text-navy-400 shrink-0" /> Last login {formatDateTime(student.lastLoginAt)}</div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full mt-5 !py-2 text-sm"
              icon={student.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              onClick={handleToggle}
            >
              {student.isActive ? 'Deactivate Account' : 'Activate Account'}
            </Button>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="font-bold text-navy-900 mb-3">Personal Details</h3>
              <InfoRow label="Full Name" value={student.fullName} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Mobile Number" value={student.mobileNumber} />
              <InfoRow label="Gender" value={student.gender} />
              <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
              <InfoRow label="Address" value={student.address} />
              <InfoRow label="City" value={student.city} />
              <InfoRow label="State" value={student.state} />
              <InfoRow label="Country" value={student.country} />
              <InfoRow label="Email Verified" value={student.isEmailVerified ? 'Yes' : 'No'} />
              <InfoRow label="Account Created" value={formatDateTime(student.createdAt)} />
              <InfoRow label="Last Login" value={student.lastLoginAt ? formatDateTime(student.lastLoginAt) : 'Never'} />
              <InfoRow label="Last Login IP" value={student.lastLoginIp} />
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-navy-900 mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-orange-500" /> Education Details</h3>
              <InfoRow label="College / Institution" value={student.collegeName} />
              <InfoRow label="University" value={student.university} />
              <InfoRow label="Degree" value={student.degree} />
              <InfoRow label="Branch / Specialization" value={student.branch} />
              <InfoRow label="Graduation Year" value={student.graduationYear} />
            </div>

            {student.registrations?.length > 0 && (
              <div className="card p-6">
                <h3 className="font-bold text-navy-900 mb-3">Internship Registrations ({student.registrations.length})</h3>
                <div className="space-y-2">
                  {student.registrations.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-800 truncate">{r.internship?.title}</p>
                        <p className="text-xs text-navy-400">{r.registrationNo || 'No reg. number yet'}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {student.certificates?.length > 0 && (
              <div className="card p-6">
                <h3 className="font-bold text-navy-900 mb-3">Certificates ({student.certificates.length})</h3>
                <div className="space-y-2">
                  {student.certificates.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy-50 last:border-0">
                      <p className="text-sm font-semibold text-navy-800 truncate">{c.internship?.title}</p>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
