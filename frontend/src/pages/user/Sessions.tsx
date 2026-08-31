import { Video, CalendarCheck, Key } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi } from '../../api/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import { formatDateTime } from '../../utils/formatters';

export default function Sessions() {
  const { data, isLoading, error, refetch } = useApiQuery<any[]>(() => userApi.sessions());

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="Available Sessions">
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <LoadingSpinner />
      ) : data.every((g: any) => g.sessions.length === 0) ? (
        <EmptyState icon={<CalendarCheck className="w-8 h-8" />} title="No sessions scheduled yet" description="Once your trainer schedules a class, it will appear here with the Zoom link to join." />
      ) : (
        <div className="space-y-6">
          {data.map((group: any) => group.sessions.length > 0 && (
            <div key={group.internshipId} className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4">{group.internshipTitle}</h3>
              <div className="space-y-3">
                {group.sessions.map((s: any) => {
                  const isPast = new Date(s.date) < new Date();
                  return (
                    <div key={s.id} className="border border-navy-100 rounded-xl p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-semibold text-navy-800 text-sm">{s.topic || 'Class Session'}</p>
                          <p className="text-xs text-navy-400 mt-0.5">{formatDateTime(s.date)} {isPast && '(past)'}</p>
                        </div>
                        {s.zoomLink && (
                          <a
                            href={s.zoomLink}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary !py-2 text-xs"
                          >
                            <Video className="w-3.5 h-3.5" /> Join Zoom
                          </a>
                        )}
                      </div>
                      {(s.zoomMeetingId || s.zoomPasscode) && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-navy-500">
                          {s.zoomMeetingId && <span>Meeting ID: <b>{s.zoomMeetingId}</b></span>}
                          {s.zoomPasscode && <span className="flex items-center gap-1"><Key className="w-3 h-3" /> Passcode: <b>{s.zoomPasscode}</b></span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
