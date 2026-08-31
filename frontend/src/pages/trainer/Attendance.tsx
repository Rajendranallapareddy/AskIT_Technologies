import { useEffect, useState } from 'react';
import { Plus, CalendarCheck, Video, Pencil, Briefcase } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { trainerApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime } from '../../utils/formatters';
import InternshipPicker, { useInternshipPicker } from './_InternshipPicker';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptySessionForm = { date: '', topic: '', zoomLink: '', zoomMeetingId: '', zoomPasscode: '' };

export default function Attendance() {
  const { internships, internshipId, setInternshipId, isLoading: isLoadingInternships, error: internshipsError } = useInternshipPicker();
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [markingSession, setMarkingSession] = useState<any | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const toast = useToast();

  const load = () => {
    if (!internshipId) return;
    setSessions(null);
    Promise.all([trainerApi.sessions(internshipId), trainerApi.participants(internshipId)])
      .then(([s, p]) => {
        setSessions(s.data.data);
        setParticipants(p.data.data);
      })
      .catch((err) => {
        setSessions([]);
        toast.error(getErrorMessage(err));
      });
  };

  useEffect(load, [internshipId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNewSession = () => { setEditingSession(null); setSessionForm(emptySessionForm); setSessionModalOpen(true); };
  const openEditSession = (s: any) => {
    setEditingSession(s);
    setSessionForm({
      date: s.date ? new Date(s.date).toISOString().slice(0, 16) : '',
      topic: s.topic || '',
      zoomLink: s.zoomLink || '',
      zoomMeetingId: s.zoomMeetingId || '',
      zoomPasscode: s.zoomPasscode || '',
    });
    setSessionModalOpen(true);
  };

  const handleSaveSession = async () => {
    try {
      if (editingSession) {
        await trainerApi.updateSession(editingSession.id, sessionForm);
        toast.success('Session updated');
      } else {
        await trainerApi.createSession(internshipId, sessionForm);
        toast.success('Session created — participants have been notified');
      }
      setSessionModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openMarking = (session: any) => {
    const initial: Record<string, string> = {};
    participants.forEach((p) => {
      const existing = session.records.find((r: any) => r.userId === p.userId);
      initial[p.userId] = existing?.status || 'PRESENT';
    });
    setMarks(initial);
    setMarkingSession(session);
  };

  const submitMarks = async () => {
    try {
      const records = Object.entries(marks).map(([userId, status]) => ({ userId, status }));
      await trainerApi.markAttendance(markingSession.id, records);
      toast.success('Attendance saved');
      setMarkingSession(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <DashboardLayout links={TRAINER_LINKS} title="Trainer Portal" pageTitle="Attendance">
      {isLoadingInternships ? (
        <LoadingSpinner label="Loading your internships…" />
      ) : internshipsError ? (
        <ErrorState message={internshipsError} />
      ) : internships.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-8 h-8" />} title="No internships assigned yet" description="An admin needs to assign you to an internship before you can schedule sessions." />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <InternshipPicker internships={internships} value={internshipId} onChange={setInternshipId} />
            <Button onClick={openNewSession} icon={<Plus className="w-4 h-4" />}>New Session</Button>
          </div>

          {sessions === null ? (
            <LoadingSpinner />
          ) : sessions.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="w-8 h-8" />} title="No sessions yet" description="Create your first session for this internship — add a Zoom link so students can join." />
          ) : (
            <div className="space-y-3">
              {sessions.map((s: any) => (
                <div key={s.id} className="card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-navy-800">{formatDateTime(s.date)} {s.topic && `— ${s.topic}`}</p>
                      <p className="text-xs text-navy-400 mt-1">{s.records.length} of {participants.length} marked</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="!py-2 text-xs" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEditSession(s)}>
                        {s.zoomLink ? 'Edit Zoom Link' : 'Add Zoom Link'}
                      </Button>
                      <Button variant="outline" className="!py-2 text-xs" onClick={() => openMarking(s)}>Mark Attendance</Button>
                    </div>
                  </div>
                  {s.zoomLink && (
                    <a href={s.zoomLink} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 text-xs font-semibold text-orange-600 hover:underline w-fit">
                      <Video className="w-3.5 h-3.5" /> Join Zoom Meeting
                      {s.zoomMeetingId && <span className="text-navy-400 font-normal">· ID: {s.zoomMeetingId}</span>}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} title={editingSession ? 'Edit Session' : 'New Session'}>
        <div className="space-y-4">
          <div><label className="label">Date &amp; Time</label><input type="datetime-local" className="input-field" value={sessionForm.date} onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} /></div>
          <div><label className="label">Topic (optional)</label><input className="input-field" value={sessionForm.topic} onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })} /></div>
          <div className="pt-2 border-t border-navy-100">
            <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Zoom Details (optional)</p>
            <div className="space-y-3">
              <div><label className="label">Zoom Link</label><input className="input-field" value={sessionForm.zoomLink} onChange={(e) => setSessionForm({ ...sessionForm, zoomLink: e.target.value })} placeholder="https://zoom.us/j/..." /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">Meeting ID</label><input className="input-field" value={sessionForm.zoomMeetingId} onChange={(e) => setSessionForm({ ...sessionForm, zoomMeetingId: e.target.value })} /></div>
                <div><label className="label">Passcode</label><input className="input-field" value={sessionForm.zoomPasscode} onChange={(e) => setSessionForm({ ...sessionForm, zoomPasscode: e.target.value })} /></div>
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={handleSaveSession} disabled={!sessionForm.date}>{editingSession ? 'Save Changes' : 'Create Session'}</Button>
        </div>
      </Modal>

      <Modal isOpen={!!markingSession} onClose={() => setMarkingSession(null)} title="Mark Attendance" maxWidth="max-w-xl">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {participants.map((p) => (
            <div key={p.userId} className="flex items-center justify-between border-b border-navy-50 pb-2">
              <span className="text-sm font-medium text-navy-700">{p.user.fullName}</span>
              <select
                value={marks[p.userId] || 'PRESENT'}
                onChange={(e) => setMarks({ ...marks, [p.userId]: e.target.value })}
                className="input-field !py-1.5 !w-36 text-xs"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EXCUSED">Excused</option>
              </select>
            </div>
          ))}
        </div>
        <Button className="w-full mt-5" onClick={submitMarks}>Save Attendance</Button>
      </Modal>
    </DashboardLayout>
  );
}
