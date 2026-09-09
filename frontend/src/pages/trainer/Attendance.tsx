import { useEffect, useState, type CSSProperties } from 'react';
import {
  Plus,
  CalendarCheck,
  Video,
  Pencil,
  Link2,
  Trash2,
  Briefcase,
  Users,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { trainerApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
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


const SESSION_TIME_ZONE = 'Asia/Kolkata';

/**
 * Formats a stored UTC/ISO date in Indian Standard Time.
 * This guarantees trainers and students see the same class time.
 */
function formatSessionDateTime(
  value: string
) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      timeZone: SESSION_TIME_ZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
  ).format(date);
}

/**
 * Converts the ISO value received from the API to the exact
 * Asia/Kolkata wall-clock value required by <input type="datetime-local">.
 */
function toIndiaDateTimeInput(
  value: string
) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          SESSION_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }
    ).formatToParts(date);

  const get = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value || '';

  return `${get('year')}-${get(
    'month'
  )}-${get('day')}T${get(
    'hour'
  )}:${get('minute')}`;
}

/**
 * datetime-local has no timezone information.
 * Treat the trainer's entered value as IST (+05:30),
 * then convert it to UTC ISO before sending it to the backend.
 *
 * Example:
 * 2026-09-10T19:30 IST -> 2026-09-10T14:00:00.000Z
 */
function indiaDateTimeInputToIso(
  value: string
) {
  const clean =
    String(value || '').trim();

  if (!clean) {
    throw new Error(
      'Session date and time are required'
    );
  }

  const normalized =
    clean.length === 16
      ? `${clean}:00`
      : clean;

  const parsed =
    new Date(
      `${normalized}+05:30`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      'Please select a valid session date and time'
    );
  }

  return parsed.toISOString();
}


type SessionActionTone =
  | 'blue'
  | 'red'
  | 'muted';

function SessionActionButton({
  tone,
  disabled = false,
  icon,
  children,
  onClick,
  title,
}: {
  tone: SessionActionTone;
  disabled?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  const [hovered, setHovered] =
    useState(false);
  const [pressed, setPressed] =
    useState(false);

  const palette = {
    blue: {
      border: '#7DB5FF',
      text: '#1D63E9',
      hoverBg: '#F2F7FF',
      hoverBorder: '#4F9CFF',
      ring:
        'rgba(77, 156, 255, 0.20)',
    },
    red: {
      border: '#FF7E7E',
      text: '#F22626',
      hoverBg: '#FFF4F4',
      hoverBorder: '#FF5A5A',
      ring:
        'rgba(242, 38, 38, 0.14)',
    },
    muted: {
      border: '#A6B5D9',
      text: '#8DA1CF',
      hoverBg: '#FFFFFF',
      hoverBorder: '#A6B5D9',
      ring: 'transparent',
    },
  } as const;

  const colors =
    palette[tone];

  const style: CSSProperties = {
    height: 36,
    minWidth:
      tone === 'muted'
        ? 150
        : tone === 'blue'
          ? 110
          : 96,
    padding: '0 13px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    border:
      `2px solid ${colors.border}`,
    background:
      !disabled && hovered
        ? colors.hoverBg
        : '#FFFFFF',
    color: colors.text,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    cursor:
      disabled
        ? 'not-allowed'
        : 'pointer',
    opacity:
      disabled ? 0.92 : 1,
    boxShadow:
      !disabled && hovered
        ? `0 7px 18px ${colors.ring}`
        : '0 1px 3px rgba(15, 35, 80, 0.04)',
    transform:
      disabled
        ? 'none'
        : pressed
          ? 'translateY(0) scale(0.98)'
          : hovered
            ? 'translateY(-1px)'
            : 'translateY(0)',
    transition:
      'background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
    userSelect: 'none',
    WebkitTapHighlightColor:
      'transparent',
    outline: 'none',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={
        disabled
          ? undefined
          : onClick
      }
      onMouseEnter={() => {
        if (!disabled) {
          setHovered(true);
        }
      }}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => {
        if (!disabled) {
          setPressed(true);
        }
      }}
      onMouseUp={() => {
        if (!disabled) {
          setPressed(false);
        }
      }}
      onFocus={(event) => {
        if (!disabled) {
          event.currentTarget.style.boxShadow =
            `0 0 0 4px ${colors.ring}`;
        }
      }}
      onBlur={(event) => {
        event.currentTarget.style.boxShadow =
          '0 1px 3px rgba(15, 35, 80, 0.04)';
      }}
      title={title}
      style={style}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
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
          toIndiaDateTimeInput(
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
          const payload = {
            ...sessionForm,
            date:
              indiaDateTimeInputToIso(
                sessionForm.date
              ),
          };

          await trainerApi.updateSession(
            editingSession.id,
            payload
          );

          toast.success(
            'Session updated'
          );
        } else {
          const response =
            await trainerApi.createSession(
              internshipId,
              {
                ...sessionForm,
                date:
                  indiaDateTimeInputToIso(
                    sessionForm.date
                  ),
              }
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


  const handleDeleteSession =
    async (session: any) => {
      const label =
        session.topic ||
        formatSessionDateTime(session.date);

      const confirmed =
        window.confirm(
          `Delete session "${label}"? This will also delete all attendance records for this session. This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        await trainerApi.deleteSession(
          session.id
        );

        toast.success(
          'Session deleted successfully'
        );

        if (
          editingSession?.id ===
          session.id
        ) {
          setEditingSession(null);
          setSessionModalOpen(false);
          setSessionForm(
            emptySessionForm
          );
        }

        if (
          markingSession?.id ===
          session.id
        ) {
          setMarkingSession(null);
        }

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(err)
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
              className="!px-4 !py-2.5 !rounded-xl !text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
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
              <div className="mb-4 rounded-2xl border border-navy-100 bg-white px-5 py-3.5 flex items-start gap-3 shadow-sm">
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
            <div className="space-y-3.5">
              {sessions.map(
                (
                  session: any
                ) => (
                  <div
                    key={session.id}
                    className="card group"
                    style={{
                      padding: '18px 22px',
                      borderRadius: 18,
                      border: '1px solid #D7E2F5',
                      background: '#FFFFFF',
                      boxShadow:
                        '0 4px 16px rgba(29, 63, 126, 0.05)',
                      transition:
                        'box-shadow 180ms ease, transform 180ms ease, border-color 180ms ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.transform =
                        'translateY(-2px)';
                      event.currentTarget.style.boxShadow =
                        '0 10px 26px rgba(29, 63, 126, 0.10)';
                      event.currentTarget.style.borderColor =
                        '#BFD3F3';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform =
                        'translateY(0)';
                      event.currentTarget.style.boxShadow =
                        '0 4px 16px rgba(29, 63, 126, 0.05)';
                      event.currentTarget.style.borderColor =
                        '#D7E2F5';
                    }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className="shrink-0 flex items-center justify-center"
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: '#EEF5FF',
                            color: '#1675FF',
                          }}
                        >
                          <CalendarCheck
                            style={{
                              width: 21,
                              height: 21,
                              strokeWidth: 2.2,
                            }}
                          />
                        </div>

                        <div className="min-w-0">
                          <p
                            className="font-semibold text-navy-800"
                            style={{
                              fontSize: 16,
                              lineHeight: 1.3,
                              color: '#173575',
                            }}
                          >
                            {formatSessionDateTime(
                              session.date
                            )}
                            {session.topic &&
                              ` — ${session.topic}`}
                          </p>

                          <p
                            className="mt-2"
                            style={{
                              fontSize: 13,
                              color: '#6B8DD6',
                              lineHeight: 1,
                            }}
                          >
                            {session.records.length}{' '}
                            of{' '}
                            {participants.length}{' '}
                            marked
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <SessionActionButton
                          tone="blue"
                          icon={
                            <Link2
                              style={{
                                width: 15,
                                height: 15,
                                strokeWidth: 2.2,
                              }}
                            />
                          }
                          onClick={() =>
                            openEditSession(
                              session
                            )
                          }
                          title={
                            session.meetLink
                              ? 'Edit meeting details'
                              : 'Add meeting link'
                          }
                        >
                          {session.meetLink
                            ? 'Edit Link'
                            : 'Add Link'}
                        </SessionActionButton>

                        <SessionActionButton
                          tone="red"
                          icon={
                            <Trash2
                              style={{
                                width: 15,
                                height: 15,
                                strokeWidth: 2.2,
                              }}
                            />
                          }
                          onClick={() =>
                            handleDeleteSession(
                              session
                            )
                          }
                          title="Delete session"
                        >
                          Delete
                        </SessionActionButton>

                        <SessionActionButton
                          tone={
                            participants.length === 0
                              ? 'muted'
                              : 'blue'
                          }
                          disabled={
                            participants.length ===
                            0
                          }
                          icon={
                            <Users
                              style={{
                                width: 15,
                                height: 15,
                                strokeWidth: 2.2,
                              }}
                            />
                          }
                          onClick={() =>
                            openMarking(
                              session
                            )
                          }
                          title={
                            participants.length === 0
                              ? 'No approved participants yet'
                              : 'Mark attendance'
                          }
                        >
                          {participants.length === 0
                            ? 'No Participants'
                            : 'Attendance'}
                        </SessionActionButton>
                      </div>
                    </div>

                    {session.meetLink && (
                      <a
                        href={session.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 flex flex-wrap items-center gap-2 w-fit"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#F97316',
                          textDecoration: 'none',
                        }}
                      >
                        <Video
                          style={{
                            width: 16,
                            height: 16,
                          }}
                        />

                        Join Meeting

                        {session.meetingId && (
                          <span
                            style={{
                              color: '#8291B3',
                              fontWeight: 400,
                            }}
                          >
                            · ID:{' '}
                            {session.meetingId}
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
            <div className="flex items-center justify-between gap-3">
              <label className="label">
                Date &amp;
                Time
              </label>

              <span className="text-[11px] font-medium text-navy-400">
                IST (Asia/Kolkata)
              </span>
            </div>

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