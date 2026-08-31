import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi } from '../../api/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { Award, Download } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import type { Certificate } from '../../types';

export default function MyCertificates() {
  const { data, isLoading, error, refetch } = useApiQuery<Certificate[]>(() => userApi.certificates());

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="My Certificates">
      {isLoading || !data ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState icon={<Award className="w-8 h-8" />} title="No certificates yet" description="Complete an internship to earn your first certificate." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((c) => (
            <div key={c.id} className="card p-6 text-center">
              <Award className={`w-10 h-10 mx-auto ${c.status === 'ISSUED' ? 'text-orange-500' : 'text-navy-300'}`} />
              <h3 className="font-bold text-navy-900 mt-3">{c.internship.title}</h3>
              <p className="text-xs text-navy-400 mt-1">#{c.certificateNo}</p>
              <p className="text-xs text-navy-500 mt-1">
                {c.status === 'ISSUED' ? `Issued ${formatDate(c.issuedAt)}` : 'Pending approval'}
              </p>
              {c.status === 'ISSUED' && c.fileUrl && (
                <a href={c.fileUrl} target="_blank" rel="noreferrer" className="btn-outline w-full mt-4 !py-2 text-xs">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
