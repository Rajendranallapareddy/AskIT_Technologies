import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { trainerApi } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/helpers';

// Shared internship selector used across trainer pages that operate on a
// specific internship (participants, attendance, materials, announcements).
//
// isLoading/error are exposed explicitly so every page using this hook can
// tell "still fetching the trainer's internship list" apart from "fetched
// fine, they just have zero internships assigned" apart from "the fetch
// failed" — previously none of that was surfaced, so any failure (or a
// trainer with no assigned internships at all) left every page that depends
// on this hook stuck on an infinite spinner, since their own per-page fetch
// is gated behind `if (!internshipId) return`, which then never ran.
export function useInternshipPicker() {
  const [params, setParams] = useSearchParams();
  const [internships, setInternships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const internshipId = params.get('internshipId') || '';

  useEffect(() => {
    setIsLoading(true);
    trainerApi
      .dashboard()
      .then((res) => {
        const list = res.data.data.internships || [];
        setInternships(list);
        if (!internshipId && list.length) {
          setParams({ internshipId: list[0].id });
        }
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setInternshipId = (id: string) => setParams({ internshipId: id });

  return { internships, internshipId, setInternshipId, isLoading, error };
}

export default function InternshipPicker({
  internships, value, onChange,
}: { internships: any[]; value: string; onChange: (id: string) => void }) {
  if (!internships.length) return null;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field max-w-xs">
      {internships.map((i) => (
        <option key={i.id} value={i.id}>{i.title}</option>
      ))}
    </select>
  );
}
