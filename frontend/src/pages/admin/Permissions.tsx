import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { superAdminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

const PERMISSION_KEYS = [
  { key: 'manageUsers', label: 'Manage Users' },
  { key: 'manageTrainers', label: 'Manage Trainers' },
  { key: 'manageCourses', label: 'Manage Courses' },
  { key: 'manageInternships', label: 'Manage Internships' },
  { key: 'manageRegistrations', label: 'Manage Registrations' },
  { key: 'manageAttendance', label: 'Manage Attendance' },
  { key: 'manageCertificates', label: 'Manage Certificates' },
  { key: 'manageAnnouncements', label: 'Manage Announcements' },
  { key: 'manageGallery', label: 'Manage Gallery' },
  { key: 'manageContactRequests', label: 'Manage Contact Requests' },
  { key: 'manageReports', label: 'Manage Reports' },
  { key: 'viewAnalytics', label: 'View Analytics' },
  { key: 'managePayments', label: 'Manage Payments' },
  { key: 'manageRefunds', label: 'Manage Refunds' },
  { key: 'manageCoupons', label: 'Manage Coupons' },
];

export default function Permissions() {
  const links = useAdminLinks();
  const [searchParams] = useSearchParams();
  const [subAdmins, setSubAdmins] = useState<any[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    superAdminApi.subAdmins().then((res) => {
      setSubAdmins(res.data.data);
      if (res.data.data.length) {
        // Deep-linked from Admin → Users → Sub Admins (?subAdminId=...) —
        // land straight on that Sub Admin's permissions instead of always
        // defaulting to the first one in the list.
        const requestedId = searchParams.get('subAdminId');
        const requested = requestedId && res.data.data.find((s: any) => s.id === requestedId);
        selectSubAdmin(requested || res.data.data[0]);
      }
    }).catch((err) => {
      setSubAdmins([]);
      toast.error(getErrorMessage(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSubAdmin = (s: any) => {
    setSelectedId(s.id);
    const p: Record<string, boolean> = {};
    PERMISSION_KEYS.forEach(({ key }) => { p[key] = s.subAdminPermissions?.[key] || false; });
    setPerms(p);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await superAdminApi.updatePermissions(selectedId, perms);
      toast.success('Permissions updated');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  return (
    <DashboardLayout links={links} title="Super Admin" pageTitle="Permissions">
      {subAdmins === null ? (
        <LoadingSpinner />
      ) : subAdmins.length === 0 ? (
        <EmptyState title="No Sub Admins yet" description="Create a Sub Admin first to assign permissions." />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-4 h-fit">
            <h3 className="font-bold text-navy-900 mb-3 px-2">Sub Admins</h3>
            <div className="space-y-1">
              {subAdmins.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSubAdmin(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition ${selectedId === s.id ? 'bg-orange-500 text-white' : 'text-navy-700 hover:bg-navy-50'}`}
                >
                  {s.fullName}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 card p-6">
            <h3 className="font-bold text-navy-900 mb-4">Access Permissions</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {PERMISSION_KEYS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 p-3 rounded-xl border border-navy-100 cursor-pointer hover:bg-navy-50">
                  <input type="checkbox" checked={perms[key] || false} onChange={(e) => setPerms({ ...perms, [key]: e.target.checked })} className="w-4 h-4 rounded border-navy-300 text-orange-500" />
                  <span className="text-sm font-medium text-navy-700">{label}</span>
                </label>
              ))}
            </div>
            <Button className="mt-6" onClick={handleSave} isLoading={isSaving} icon={<Save className="w-4 h-4" />}>Save Permissions</Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
