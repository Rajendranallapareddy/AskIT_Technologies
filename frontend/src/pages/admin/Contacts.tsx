import { useEffect, useState } from 'react';
import { Mail, Phone, Reply, Send } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDateTime } from '../../utils/formatters';
import DataTable, { Column } from '../../components/admin/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import FilterPanel from '../../components/common/FilterPanel';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function AdminContacts() {
  const links = useAdminLinks();
  const [contacts, setContacts] = useState<any[] | null>(null);
  const [status, setStatus] = useState('');
  const [replyTarget, setReplyTarget] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const toast = useToast();

  const load = () => {
    setContacts(null);

    adminApi
      .contacts({ status: status || undefined })
      .then((res) => setContacts(res.data.data))
      .catch((err) => {
        setContacts([]);
        toast.error(getErrorMessage(err));
      });
  };

  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const openReply = (contact: any) => {
    setReplyTarget(contact);
    setReplyMessage('');
  };

  const closeReply = () => {
    if (isSending) return;
    setReplyTarget(null);
    setReplyMessage('');
  };

  const handleSendReply = async () => {
    if (!replyTarget) return;

    const message = replyMessage.trim();

    if (!message) {
      toast.error('Please enter your reply');
      return;
    }

    try {
      setIsSending(true);

      const res = await adminApi.replyToContact(replyTarget.id, message);

      toast.success(res.data.message || 'Reply sent successfully');

      setReplyTarget(null);
      setReplyMessage('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkReplied = async (id: string) => {
    try {
      await adminApi.updateContact(id, 'REPLIED');
      toast.success('Marked as replied');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Name',
      render: (c) => <span className="font-semibold text-navy-800">{c.name}</span>,
    },
    {
      header: 'Email',
      render: (c) => (
        <div className="text-navy-700 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 shrink-0 text-orange-500" />
          {c.email}
        </div>
      ),
    },
    {
      header: 'Phone',
      render: (c) =>
        c.phone ? (
          <a
            href={`tel:${c.phone}`}
            className="text-navy-700 hover:text-orange-600 flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            {c.phone}
          </a>
        ) : (
          <span className="text-navy-300">—</span>
        ),
    },
    {
      header: 'Subject',
      render: (c) => c.subject || '—',
    },
    {
      header: 'Message',
      className: 'max-w-xs',
      render: (c) => <span className="line-clamp-2">{c.message}</span>,
    },
    {
      header: 'Received',
      render: (c) => formatDateTime(c.createdAt),
    },
    {
      header: 'Status',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openReply(c)}
            className="text-orange-600 text-xs font-bold hover:underline flex items-center gap-1"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>

          {c.status === 'NEW' && (
            <button
              type="button"
              onClick={() => handleMarkReplied(c.id)}
              className="text-navy-500 text-xs font-semibold hover:text-navy-800"
            >
              Mark Replied
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DashboardLayout links={links} title="Admin Portal" pageTitle="Contact Requests">
        <div className="mb-5">
          <FilterPanel
            value={status}
            onChange={setStatus}
            options={[
              { label: 'All', value: '' },
              { label: 'New', value: 'NEW' },
              { label: 'Replied', value: 'REPLIED' },
              { label: 'Archived', value: 'ARCHIVED' },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          rows={contacts}
          keyField={(c) => c.id}
          emptyTitle="No contact requests"
        />
      </DashboardLayout>

      <Modal isOpen={!!replyTarget} onClose={closeReply} title="Reply to Contact">
        {replyTarget && (
          <div className="space-y-5">
            <div className="rounded-xl bg-navy-50 p-4">
              <p className="text-xs text-navy-400">To</p>
              <p className="font-semibold text-navy-900 mt-1">{replyTarget.name}</p>
              <p className="text-sm text-orange-600">{replyTarget.email}</p>

              <p className="mt-3 text-xs text-navy-400">Subject</p>
              <p className="text-sm font-medium text-navy-700 mt-1">
                Re: {replyTarget.subject || 'Your enquiry to AskIT Technologies'}
              </p>
            </div>

            <div>
              <label className="label">Original Message</label>
              <div className="rounded-xl border border-navy-100 bg-gray-50 p-4 text-sm text-navy-600 whitespace-pre-wrap">
                {replyTarget.message}
              </div>
            </div>

            <div>
              <label className="label">Your Reply</label>

              <textarea
                className="input-field min-h-[180px] resize-y"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                maxLength={5000}
                placeholder="Write your reply to the customer..."
              />

              <p className="text-right text-xs text-navy-400 mt-1">
                {replyMessage.length}/5000
              </p>
            </div>

            <div className="rounded-lg bg-orange-50 px-4 py-3 text-xs text-orange-800">
              This reply will be sent through the AskIT Technologies official email account:{' '}
              <strong>info@askittechnologies.com</strong>
            </div>

            <Button className="w-full" isLoading={isSending} onClick={handleSendReply}>
              <Send className="w-4 h-4" />
              Send Reply
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}