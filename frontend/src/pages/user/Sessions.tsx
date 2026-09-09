import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  CalendarCheck,
  RefreshCw,
  Video,
  Wifi,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { userApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

type Session = {
  id: string;
  internshipId: string;
  date: string;
  topic?: string | null;
  meetLink?: string | null;
  meetingId?: string | null;
  passcode?: string | null;
};

type SessionGroup = {
  internshipId: string;
  internshipTitle: string;
  sessions: Session[];
};

const REFRESH_INTERVAL_MS = 5000;


const SESSION_TIME_ZONE = 'Asia/Kolkata';

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

export default function Sessions() {
  const [groups, setGroups] =
    useState<SessionGroup[] | null>(
      null
    );

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(
      null
    );

  const toast =
    useToast();

  const mountedRef =
    useRef(true);

  const requestInFlightRef =
    useRef(false);

  const loadSessions =
    useCallback(
      async (
        options?: {
          silent?: boolean;
        }
      ) => {
        if (
          requestInFlightRef.current
        ) {
          return;
        }

        requestInFlightRef.current =
          true;

        if (!options?.silent) {
          setRefreshing(true);
        }

        try {
          const response =
            await userApi.sessions();

          if (!mountedRef.current) {
            return;
          }

          const data =
            Array.isArray(
              response.data?.data
            )
              ? response.data.data
              : [];

          setGroups(data);

          setLastUpdated(
            new Date()
          );
        } catch (err) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          if (!options?.silent) {
            toast.error(
              getErrorMessage(err)
            );
          }
        } finally {
          requestInFlightRef.current =
            false;

          if (
            mountedRef.current &&
            !options?.silent
          ) {
            setRefreshing(false);
          }
        }
      },
      [toast]
    );

  /*
   * Initial load.
   */
  useEffect(() => {
    mountedRef.current = true;

    void loadSessions();

    return () => {
      mountedRef.current = false;
    };
  }, [loadSessions]);

  /*
   * Automatically refresh the student's session
   * data every 5 seconds.
   *
   * This means if the trainer changes:
   * - date
   * - time
   * - topic
   * - Meet link
   *
   * the student page receives the latest database
   * value without needing to log out or reopen
   * the website.
   */
  useEffect(() => {
    const interval =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            void loadSessions({
              silent: true,
            });
          }
        },
        REFRESH_INTERVAL_MS
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [loadSessions]);

  /*
   * Refresh immediately when the user comes back
   * to this browser tab.
   */
  useEffect(() => {
    const refreshOnFocus =
      () => {
        void loadSessions({
          silent: true,
        });
      };

    const refreshOnVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void loadSessions({
            silent: true,
          });
        }
      };

    const refreshOnOnline =
      () => {
        void loadSessions({
          silent: true,
        });
      };

    window.addEventListener(
      'focus',
      refreshOnFocus
    );

    window.addEventListener(
      'online',
      refreshOnOnline
    );

    document.addEventListener(
      'visibilitychange',
      refreshOnVisibility
    );

    return () => {
      window.removeEventListener(
        'focus',
        refreshOnFocus
      );

      window.removeEventListener(
        'online',
        refreshOnOnline
      );

      document.removeEventListener(
        'visibilitychange',
        refreshOnVisibility
      );
    };
  }, [loadSessions]);

  const allSessions =
    (groups || [])
      .flatMap(
        (group) =>
          group.sessions.map(
            (session) => ({
              ...session,
              internshipTitle:
                group.internshipTitle,
            })
          )
      )
      .sort(
        (a, b) =>
          new Date(
            b.date
          ).getTime() -
          new Date(
            a.date
          ).getTime()
      );

  return (
    <DashboardLayout
      links={USER_LINKS}
      title="Student Portal"
      pageTitle="My Sessions"
    >
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy-800">
            Class Sessions
          </p>

          <p className="mt-1 text-xs text-navy-400">
            Session date, time and
            meeting details update
            automatically when your
            trainer changes them. Times
            are shown in IST.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden sm:inline text-[11px] text-navy-400">
              Updated{' '}
              {lastUpdated.toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              void loadSessions()
            }
            disabled={refreshing}
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-blue-200
              bg-white
              px-3
              text-xs
              font-semibold
              text-blue-600
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:border-blue-300
              hover:bg-blue-50
              hover:shadow
              active:translate-y-0
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm">
          <Wifi className="w-4 h-4" />
        </div>

        <div>
          <p className="text-xs font-semibold text-navy-700">
            Live session updates enabled
          </p>

          <p className="text-[11px] text-navy-400 mt-0.5">
            This page checks for trainer
            changes automatically.
          </p>
        </div>
      </div>

      {groups === null ? (
        <LoadingSpinner
          label="Loading sessions…"
        />
      ) : allSessions.length ===
        0 ? (
        <EmptyState
          icon={
            <CalendarCheck className="w-8 h-8" />
          }
          title="No sessions yet"
          description="Your trainer has not scheduled any sessions yet."
        />
      ) : (
        <div className="space-y-3">
          {allSessions.map(
            (session) => (
              <div
                key={session.id}
                className="
                  rounded-2xl
                  border
                  border-navy-100
                  bg-white
                  px-5
                  py-4
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:border-blue-200
                  hover:shadow-md
                "
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="mt-0.5 w-11 h-11 shrink-0 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-navy-800 text-[15px] sm:text-base">
                        {formatSessionDateTime(
                          session.date
                        )}

                        {session.topic &&
                          ` — ${session.topic}`}
                      </p>

                      <p className="mt-1 text-xs text-navy-400">
                        {
                          session.internshipTitle
                        }
                      </p>

                      {session.meetingId && (
                        <p className="mt-1 text-[11px] text-navy-400">
                          Meeting ID:{' '}
                          {session.meetingId}
                        </p>
                      )}

                      {session.passcode && (
                        <p className="mt-0.5 text-[11px] text-navy-400">
                          Passcode:{' '}
                          {session.passcode}
                        </p>
                      )}
                    </div>
                  </div>

                  {session.meetLink ? (
                    <a
                      href={
                        session.meetLink
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="
                        inline-flex
                        h-9
                        shrink-0
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-orange-200
                        bg-orange-50
                        px-3.5
                        text-xs
                        font-semibold
                        text-orange-600
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:border-orange-300
                        hover:bg-orange-100
                        hover:shadow-sm
                        active:translate-y-0
                      "
                    >
                      <Video className="w-4 h-4" />

                      Join Meeting
                    </a>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-xl border border-navy-100 bg-navy-50/50 px-3.5 text-xs font-semibold text-navy-300">
                      Meeting link pending
                    </span>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
