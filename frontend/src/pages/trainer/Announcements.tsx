import { useEffect, useState } from 'react';
import { Megaphone, Send, Briefcase } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { trainerApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import InternshipPicker, { useInternshipPicker } from './_InternshipPicker';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function Announcements() {
  const { internships, internshipId, setInternshipId, isLoading: isLoadingInternships, error: internshipsError } = useInternshipPicker();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => { setSent([]); }, [internshipId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await trainerApi.postAnnouncement(internshipId, { title, message });
      toast.success('Announcement posted to all participants');
      setSent((prev) => [res.data.data, ...prev]);
      setTitle(''); setMessage('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardLayout links={TRAINER_LINKS} title="Trainer Portal" pageTitle="Announcements">
      {isLoadingInternships ? (
        <LoadingSpinner label="Loading your internships…" />
      ) : internshipsError ? (
        <ErrorState message={internshipsError} />
      ) : internships.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-8 h-8" />} title="No internships assigned yet" description="An admin needs to assign you to an internship before you can post announcements." />
      ) : (
        <>
          <div className="mb-5"><InternshipPicker internships={internships} value={internshipId} onChange={setInternshipId} /></div>

          <form onSubmit={handleSubmit} className="card p-6 mb-6 space-y-4">
            <div><label className="label">Title</label><input required className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="label">Message</label><textarea required rows={3} className="input-field" value={message} onChange={(e) => setMessage(e.target.value)} /></div>
            <Button type="submit" isLoading={isSending} icon={<Send className="w-4 h-4" />}>Post Announcement</Button>
          </form>

          {sent.length === 0 ? (
            <EmptyState icon={<Megaphone className="w-8 h-8" />} title="No announcements posted this session" />
          ) : (
            <div className="space-y-3">
              {sent.map((a: any) => (
                <div key={a.id} className="card p-5">
                  <p className="font-semibold text-navy-800">{a.title}</p>
                  <p className="text-sm text-navy-500 mt-1">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
