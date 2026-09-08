import { useEffect, useState } from 'react';
import {
  Plus,
  CalendarCheck,
  Video,
  Pencil,
  Briefcase,
  Users,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { trainerApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime } from '../../utils/formatters';
import InternshipPicker, {
  useInternshipPicker,
} from './_InternshipPicker';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptySessionForm = {
  date: '',
  topic: '',
  meetLink: '',
  meetingId: '',
  passcode: '',
};

function toLocalDateTimeInput(
  value: string
) {
  if (!value) return '';

  const date =
    new Date(value);

  const pad = (
    number: number
  ) =>
    String(number).padStart(
      2,
      '0'
    );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}T${pad(
    date.getHours()
  )}:${pad(
    date.getMinutes()
  )}`;
}

export default function Attendance() {
  const {
    internships,
    internshipId,
    setInternshipId,

    isLoading:
      isLoadingInternships,

    error:
      internshipsError,
  } =
    useInternshipPicker();

  const [
    sessions,
    setSessions,
  ] =
    useState<any[] | null>(
      null
    );

  const [
    participants,
    setParticipants,
  ] =
    useState<any[]>([]);

  const [
    sessionModalOpen,
    setSessionModalOpen,
  ] =
    useState(false);

  const [
    editingSession,
    setEditingSession,
  ] =
    useState<any | null>(
      null
    );

  const [
    sessionForm,
    setSessionForm,
  ] =
    useState(
      emptySessionForm
    );

  const [
    markingSession,
    setMarkingSession,
  ] =
    useState<any | null>(
      null
    );

  const [
    marks,
    setMarks,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const toast =
    useToast();

  const load = () => {
    if (!internshipId) {
      return;
    }

    setSessions(null);

    Promise.all([
      trainerApi.sessions(
        internshipId
      ),

      trainerApi.participants(
        internshipId
      ),
    ])
      .then(
        ([
          sessionResponse,
          participantResponse,
        ]) => {
          setSessions(
            sessionResponse
              .data.data
          );

          setParticipants(
            participantResponse
              .data.data
          );
        }
      )
      .catch(
        (err) => {
          setSessions([]);
          setParticipants([]);

          toast.error(
            getErrorMessage(
              err
            )
          );
        }
      );
  };

  useEffect(
    load,
    [internshipId]
  );
  // eslint-disable-line react-hooks/exhaustive-deps

  const openNewSession =
    () => {
      setEditingSession(
        null
      );

      setSessionForm(
        emptySessionForm
      );

      setSessionModalOpen(
        true
      );
    };

  const openEditSession =
    (session: any) => {
      setEditingSession(
        session
      );

      setSessionForm({
        date:
          toLocalDateTimeInput(
            session.date
          ),

        topic:
          session.topic ||
          '',

        meetLink:
          session.meetLink ||
          '',

        meetingId:
          session.meetingId ||
          '',

        passcode:
          session.passcode ||
          '',
      });

      setSessionModalOpen(
        true
      );
    };

  const handleSaveSession =
    async () => {
      try {
        if (
          !sessionForm.date
        ) {
          toast.error(
            'Please select the session date and time'
          );

          return;
        }

        if (
          editingSession
        ) {
          await trainerApi.updateSession(
            editingSession.id,
            sessionForm
          );

          toast.success(
            'Session updated'
          );
        } else {
          const response =
            await trainerApi.createSession(
              internshipId,
              sessionForm
            );

          toast.success(
            response.data
              ?.message ||
              'Session created successfully'
          );
        }

        setSessionModalOpen(
          false
        );

        setSessionForm(
          emptySessionForm
        );

        setEditingSession(
          null
        );

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(
            err
          )
        );
      }
    };

  const openMarking =
    (session: any) => {
      if (
        participants.length ===
        0
      ) {
        toast.error(
          'No approved participants are available yet'
        );

        return;
      }

      const initial: Record<
        string,
        string
      > = {};

      participants.forEach(
        (participant) => {
          const existing =
            session.records.find(
              (
                record: any
              ) =>
                record.userId ===
                participant.userId
            );

          initial[
            participant.userId
          ] =
            existing?.status ||
            'PRESENT';
        }
      );

      setMarks(initial);

      setMarkingSession(
        session
      );
    };

  const submitMarks =
    async () => {
      try {
        const records =
          Object.entries(
            marks
          ).map(
            ([
              userId,
              status,
            ]) => ({
              userId,
              status,
            })
          );

        if (
          records.length ===
          0
        ) {
          toast.error(
            'No participants are available to mark'
          );

          return;
        }

        await trainerApi.markAttendance(
          markingSession.id,
          records
        );

        toast.success(
          'Attendance saved'
        );

        setMarkingSession(
          null
        );

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(
            err
          )
        );
      }
    };

  return (
    <DashboardLayout
      links={TRAINER_LINKS}
      title="Trainer Portal"
      pageTitle="Attendance"
    >
      {isLoadingInternships ? (
        <LoadingSpinner
          label="Loading your internships…"
        />
      ) : internshipsError ? (
        <ErrorState
          message={
            internshipsError
          }
        />
      ) : internships.length ===
        0 ? (
        <EmptyState
          icon={
            <Briefcase className="w-8 h-8" />
          }
          title="No internships assigned yet"
          description="An admin needs to assign you to an internship before you can schedule sessions."
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <InternshipPicker
              internships={
                internships
              }
              value={
                internshipId
              }
              onChange={
                setInternshipId
              }
            />

            <Button
              onClick={
                openNewSession
              }
              icon={
                <Plus className="w-4 h-4" />
              }
            >
              New Session
            </Button>
          </div>

          {participants.length ===
            0 &&
            sessions !==
              null && (
              <div className="mb-4 rounded-xl border border-navy-100 bg-white p-4 flex items-start gap-3">
                <Users className="w-5 h-5 text-orange-500 mt-0.5" />

                <div>
                  <p className="text-sm font-semibold text-navy-800">
                    No approved
                    participants yet
                  </p>

                  <p className="text-xs text-navy-500 mt-1">
                    You can still
                    create and edit
                    sessions.
                    Attendance can be
                    marked after
                    students are
                    approved.
                  </p>
                </div>
              </div>
            )}

          {sessions ===
          null ? (
            <LoadingSpinner />
          ) : sessions.length ===
            0 ? (
            <EmptyState
              icon={
                <CalendarCheck className="w-8 h-8" />
              }
              title="No sessions yet"
              description="Create your first session. Meeting details are optional."
            />
          ) : (
            <div className="space-y-3">
              {sessions.map(
                (
                  session: any
                ) => (
                  <div
                    key={
                      session.id
                    }
                    className="card p-5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-semibold text-navy-800">
                          {formatDateTime(
                            session.date
                          )}

                          {session.topic &&
                            ` — ${session.topic}`}
                        </p>

                        <p className="text-xs text-navy-400 mt-1">
                          {
                            session
                              .records
                              .length
                          }{' '}
                          of{' '}
                          {
                            participants.length
                          }{' '}
                          marked
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          className="!py-2 text-xs"
                          icon={
                            <Pencil className="w-3.5 h-3.5" />
                          }
                          onClick={() =>
                            openEditSession(
                              session
                            )
                          }
                        >
                          {session.meetLink
                            ? 'Edit Meeting'
                            : 'Add Meeting Link'}
                        </Button>

                        <Button
                          variant="outline"
                          className="!py-2 text-xs"
                          onClick={() =>
                            openMarking(
                              session
                            )
                          }
                          disabled={
                            participants.length ===
                            0
                          }
                        >
                          {participants.length ===
                          0
                            ? 'No Participants Yet'
                            : 'Mark Attendance'}
                        </Button>
                      </div>
                    </div>

                    {session.meetLink && (
                      <a
                        href={
                          session.meetLink
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-orange-600 hover:underline w-fit"
                      >
                        <Video className="w-3.5 h-3.5" />

                        Join Meeting

                        {session.meetingId && (
                          <span className="text-navy-400 font-normal">
                            · ID:{' '}
                            {
                              session.meetingId
                            }
                          </span>
                        )}
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={
          sessionModalOpen
        }
        onClose={() =>
          setSessionModalOpen(
            false
          )
        }
        title={
          editingSession
            ? 'Edit Session'
            : 'New Session'
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Date &amp;
              Time
            </label>

            <input
              type="datetime-local"
              className="input-field"
              value={
                sessionForm.date
              }
              onChange={(
                event
              ) =>
                setSessionForm({
                  ...sessionForm,

                  date:
                    event
                      .target
                      .value,
                })
              }
            />
          </div>

          <div>
            <label className="label">
              Topic
              (optional)
            </label>

            <input
              className="input-field"
              value={
                sessionForm.topic
              }
              onChange={(
                event
              ) =>
                setSessionForm({
                  ...sessionForm,

                  topic:
                    event
                      .target
                      .value,
                })
              }
              placeholder="e.g. Python With AI"
            />
          </div>

          <div className="pt-2 border-t border-navy-100">
            <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" />

              Meeting Details
              (optional)
            </p>

            <div className="space-y-3">
              <div>
                <label className="label">
                  Google Meet
                  Link
                  (optional)
                </label>

                <input
                  className="input-field"
                  value={
                    sessionForm.meetLink
                  }
                  onChange={(
                    event
                  ) =>
                    setSessionForm({
                      ...sessionForm,

                      meetLink:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">
                    Meeting ID
                    (optional)
                  </label>

                  <input
                    className="input-field"
                    value={
                      sessionForm.meetingId
                    }
                    onChange={(
                      event
                    ) =>
                      setSessionForm({
                        ...sessionForm,

                        meetingId:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="label">
                    Passcode
                    (optional)
                  </label>

                  <input
                    className="input-field"
                    value={
                      sessionForm.passcode
                    }
                    onChange={(
                      event
                    ) =>
                      setSessionForm({
                        ...sessionForm,

                        passcode:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={
              handleSaveSession
            }
            disabled={
              !sessionForm.date
            }
          >
            {editingSession
              ? 'Save Changes'
              : 'Create Session'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={
          !!markingSession
        }
        onClose={() =>
          setMarkingSession(
            null
          )
        }
        title="Mark Attendance"
        maxWidth="max-w-xl"
      >
        {participants.length ===
        0 ? (
          <EmptyState
            icon={
              <Users className="w-8 h-8" />
            }
            title="No participants yet"
            description="Attendance can be marked after students are approved for this internship."
          />
        ) : (
          <>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {participants.map(
                (
                  participant
                ) => (
                  <div
                    key={
                      participant.userId
                    }
                    className="flex items-center justify-between border-b border-navy-50 pb-2 gap-3"
                  >
                    <span className="text-sm font-medium text-navy-700">
                      {
                        participant
                          .user
                          .fullName
                      }
                    </span>

                    <select
                      value={
                        marks[
                          participant
                            .userId
                        ] ||
                        'PRESENT'
                      }
                      onChange={(
                        event
                      ) =>
                        setMarks({
                          ...marks,

                          [participant.userId]:
                            event
                              .target
                              .value,
                        })
                      }
                      className="input-field !py-1.5 !w-36 text-xs"
                    >
                      <option value="PRESENT">
                        Present
                      </option>

                      <option value="ABSENT">
                        Absent
                      </option>

                      <option value="LATE">
                        Late
                      </option>

                      <option value="EXCUSED">
                        Excused
                      </option>
                    </select>
                  </div>
                )
              )}
            </div>

            <Button
              className="w-full mt-5"
              onClick={
                submitMarks
              }
            >
              Save
              Attendance
            </Button>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}