import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Users as UsersIcon, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { useAuth } from '../../hooks/useAuth';
import { adminApi, superAdminApi } from '../../api/endpoints';

interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number | null;
  accent: string;
  onClick: () => void;
}

function CategoryCard({ icon, title, description, count, accent, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="card p-6 text-left w-full hover:shadow-lg hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
        <ChevronRight className="w-5 h-5 text-navy-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition" />
      </div>
      <h3 className="mt-4 font-bold text-lg text-navy-900">{title}</h3>
      <p className="text-sm text-navy-500 mt-1">{description}</p>
      <p className="mt-4 text-3xl font-extrabold text-navy-900">
        {count === null ? <span className="inline-block w-10 h-7 bg-navy-100 rounded animate-pulse" /> : count}
      </p>
    </button>
  );
}

// Landing page for Admin → Users: instead of one flat mixed table, this
// splits accounts into the three categories a Super Admin actually thinks
// in — Students, Sub Admins, Trainers — each going to its own list, with
// its own detail view suited to what's actually useful to see about that
// kind of account.
export default function UsersHub() {
  const links = useAdminLinks();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [subAdminCount, setSubAdminCount] = useState<number | null>(null);
  const [trainerCount, setTrainerCount] = useState<number | null>(null);

  useEffect(() => {
    adminApi.users({ role: 'USER', limit: 1 }).then((res) => setStudentCount(res.data.meta?.total ?? res.data.data.length)).catch(() => setStudentCount(0));
    adminApi.trainers().then((res) => setTrainerCount(res.data.data.length)).catch(() => setTrainerCount(0));
    if (isSuperAdmin) {
      superAdminApi.subAdmins().then((res) => setSubAdminCount(res.data.data.length)).catch(() => setSubAdminCount(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="Users">
      <p className="text-sm text-navy-500 mb-6">Pick a category to view and manage those accounts.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <CategoryCard
          icon={<UsersIcon className="w-6 h-6 text-blue-600" />}
          accent="bg-blue-50"
          title="Students"
          description="Everyone who signed up on the website"
          count={studentCount}
          onClick={() => navigate('/admin/users/students')}
        />
        {isSuperAdmin && (
          <CategoryCard
            icon={<ShieldCheck className="w-6 h-6 text-purple-600" />}
            accent="bg-purple-50"
            title="Sub Admins"
            description="Staff accounts with limited admin access"
            count={subAdminCount}
            onClick={() => navigate('/admin/users/subadmins')}
          />
        )}
        <CategoryCard
          icon={<GraduationCap className="w-6 h-6 text-orange-600" />}
          accent="bg-orange-50"
          title="Trainers"
          description="Instructors assigned to internships"
          count={trainerCount}
          onClick={() => navigate('/admin/users/trainers')}
        />
      </div>
    </DashboardLayout>
  );
}
