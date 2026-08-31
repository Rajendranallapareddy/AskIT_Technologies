import { useEffect, useState } from 'react';
import { Users, Briefcase } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { trainerApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import InternshipPicker, { useInternshipPicker } from './_InternshipPicker';
import { initials } from '../../utils/formatters';

export default function Participants() {
  const { internships, internshipId, setInternshipId, isLoading: isLoadingInternships, error: internshipsError } = useInternshipPicker();
  const [participants, setParticipants] = useState<any[] | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!internshipId) return;
    setParticipants(null);
    trainerApi.participants(internshipId).then((res) => setParticipants(res.data.data)).catch((err) => {
      setParticipants([]);
      toast.error(getErrorMessage(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internshipId]);

  return (
    <DashboardLayout links={TRAINER_LINKS} title="Trainer Portal" pageTitle="Participants">
      {isLoadingInternships ? (
        <LoadingSpinner label="Loading your internships…" />
      ) : internshipsError ? (
        <ErrorState message={internshipsError} />
      ) : internships.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-8 h-8" />} title="No internships assigned yet" description="An admin needs to assign you to an internship before you can see participants." />
      ) : (
        <>
          <div className="mb-5">
            <InternshipPicker internships={internships} value={internshipId} onChange={setInternshipId} />
          </div>
          {participants === null ? (
            <LoadingSpinner />
          ) : participants.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8" />} title="No approved participants yet" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map((p: any) => (
                <div key={p.id} className="card p-5 flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-navy-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials(p.user.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-800 text-sm truncate">{p.user.fullName}</p>
                    <p className="text-xs text-navy-500 truncate">{p.user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
