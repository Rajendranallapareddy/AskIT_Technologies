import { FileText, Download, FolderOpen } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi } from '../../api/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { formatDate } from '../../utils/formatters';

export default function MyMaterials() {
  const { data, isLoading, error, refetch } = useApiQuery<any[]>(() => userApi.materials());

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="Study Materials">
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState icon={<FolderOpen className="w-8 h-8" />} title="No materials yet" description="Once you're approved for an internship, any materials your trainer uploads will appear here, organized by course." />
      ) : (
        <div className="space-y-6">
          {data.map((group: any) => (
            <div key={group.internshipId} className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4">{group.internshipTitle}</h3>
              {group.materials.length === 0 ? (
                <p className="text-sm text-navy-400">No materials uploaded for this internship yet.</p>
              ) : (
                <div className="space-y-2">
                  {group.materials.map((m: any) => (
                    <a
                      key={m.id}
                      href={m.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between border border-navy-100 rounded-xl px-4 py-3 hover:bg-navy-50 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-800 truncate">{m.title}</p>
                          {m.trainer?.user?.fullName && <p className="text-xs text-navy-400">By {m.trainer.user.fullName}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-navy-400">{formatDate(m.createdAt)}</span>
                        <Download className="w-4 h-4 text-navy-400" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
