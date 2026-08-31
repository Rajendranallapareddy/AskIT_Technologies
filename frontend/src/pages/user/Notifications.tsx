import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useNotificationStore } from '../../store/notificationStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { Bell, BellRing, BellPlus, CheckCheck } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { isPushSupported, getExistingSubscription, enablePush, disablePush } from '../../lib/push';
import { useToast } from '../../hooks/useToast';

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { notifications, unreadCount, markRead, markAllRead, fetchAll } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
    if (isPushSupported()) {
      getExistingSubscription().then((sub) => setPushOn(!!sub));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
        toast.success('Push notifications turned off');
      } else {
        const ok = await enablePush();
        setPushOn(ok);
        toast[ok ? 'success' : 'error'](
          ok ? 'Push notifications enabled — you\'ll get updates even off-site' : 'Could not enable push (permission denied or not configured)'
        );
      }
    } catch {
      toast.error('Something went wrong enabling push notifications');
    } finally {
      setPushBusy(false);
    }
  };

  const handleClick = (n: (typeof notifications)[number]) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="Notifications">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <p className="text-sm text-navy-500">
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You\'re all caught up'}
        </p>
        <div className="flex items-center gap-2">
          {isPushSupported() && (
            <button
              onClick={togglePush}
              disabled={pushBusy}
              className={`btn-outline text-xs flex items-center gap-1.5 ${pushOn ? 'text-green-600 border-green-300' : ''}`}
            >
              <BellPlus className="w-3.5 h-3.5" /> {pushOn ? 'Push enabled' : 'Enable push notifications'}
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-outline text-xs flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <EmptyState icon={<Bell className="w-8 h-8" />} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="card divide-y divide-navy-50">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left flex items-start gap-3 p-5 hover:bg-navy-50/50 transition ${!n.isRead ? 'bg-orange-50/40' : ''}`}
            >
              <BellRing className={`w-5 h-5 mt-0.5 shrink-0 ${!n.isRead ? 'text-orange-500' : 'text-navy-300'}`} />
              <div>
                <p className="text-sm font-semibold text-navy-800">{n.title}</p>
                <p className="text-sm text-navy-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-navy-400 mt-1">{formatDateTime(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
