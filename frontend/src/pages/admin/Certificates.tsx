import {
  useEffect,
  useState,
} from 'react';

import {
  Award,
  Send,
  Download,
  RefreshCcw,
} from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { adminApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { formatDate } from '../../utils/formatters';

import DataTable, {
  Column,
} from '../../components/admin/DataTable';

import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function AdminCertificates() {
  const links =
    useAdminLinks();

  const [
    certificates,
    setCertificates,
  ] =
    useState<any[] | null>(
      null
    );

  const [
    internships,
    setInternships,
  ] =
    useState<any[]>([]);

  const [
    genOpen,
    setGenOpen,
  ] =
    useState(false);

  const [
    selectedInternship,
    setSelectedInternship,
  ] =
    useState('');

  const [
    participants,
    setParticipants,
  ] =
    useState<any[]>([]);

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState('');

  const [
    downloadingId,
    setDownloadingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    reissuingId,
    setReissuingId,
  ] =
    useState<string | null>(
      null
    );

  const toast =
    useToast();

  const load = () => {
    setCertificates(null);

    adminApi
      .certificates()
      .then((res) =>
        setCertificates(
          res.data.data
        )
      )
      .catch((err) => {
        setCertificates([]);

        toast.error(
          getErrorMessage(err)
        );
      });
  };

  useEffect(
    load,
    []
  );

  useEffect(() => {
    if (!genOpen) {
      return;
    }

    adminApi
      .internships({
        limit: 100,
      })
      .then((res) =>
        setInternships(
          res.data.data
        )
      )
      .catch((err) => {
        setInternships([]);

        toast.error(
          getErrorMessage(err)
        );
      });
  }, [genOpen]);

  useEffect(() => {
    if (
      !selectedInternship
    ) {
      setParticipants([]);
      return;
    }

    adminApi
      .registrations(
        selectedInternship,
        {
          status:
            'APPROVED',
          limit: 100,
        }
      )
      .then((res) =>
        setParticipants(
          res.data.data
        )
      )
      .catch((err) => {
        setParticipants([]);

        toast.error(
          getErrorMessage(err)
        );
      });
  }, [
    selectedInternship,
  ]);

  const handleGenerate =
    async () => {
      try {
        await adminApi.generateCertificate(
          selectedUser,
          selectedInternship
        );

        toast.success(
          'Certificate record created (pending)'
        );

        setGenOpen(false);
        setSelectedInternship(
          ''
        );
        setSelectedUser('');
        setParticipants([]);

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(err)
        );
      }
    };

  const handleIssue =
    async (id: string) => {
      try {
        await adminApi.issueCertificate(
          id
        );

        toast.success(
          'Certificate issued and stored securely'
        );

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(err)
        );
      }
    };

  const handleDownload =
    async (id: string) => {
      if (downloadingId) {
        return;
      }

      setDownloadingId(id);

      try {
        const response =
          await adminApi.downloadCertificate(
            id
          );

        const fileUrl =
          response.data?.data
            ?.fileUrl;

        if (!fileUrl) {
          throw new Error(
            'Certificate download URL was not returned.'
          );
        }

        const opened =
          window.open(
            fileUrl,
            '_blank',
            'noopener,noreferrer'
          );

        if (!opened) {
          window.location.href =
            fileUrl;
        }
      } catch (err) {
        toast.error(
          getErrorMessage(err)
        );
      } finally {
        setDownloadingId(
          null
        );
      }
    };

  const handleReissue =
    async (id: string) => {
      if (reissuingId) {
        return;
      }

      setReissuingId(id);

      try {
        await adminApi.reissueCertificate(
          id
        );

        toast.success(
          'Certificate regenerated with the latest design'
        );

        load();
      } catch (err) {
        toast.error(
          getErrorMessage(err)
        );
      } finally {
        setReissuingId(
          null
        );
      }
    };

  const columns: Column<any>[] =
    [
      {
        header:
          'Certificate No.',

        render: (c) => (
          <span className="font-mono text-xs">
            {
              c.certificateNo
            }
          </span>
        ),
      },

      {
        header: 'Student',

        render: (c) =>
          c.user.fullName,
      },

      {
        header:
          'Internship',

        render: (c) =>
          c.internship.title,
      },

      {
        header: 'Status',

        render: (c) => (
          <StatusBadge
            status={
              c.status
            }
          />
        ),
      },

      {
        header: 'Issued',

        render: (c) =>
          c.issuedAt
            ? formatDate(
                c.issuedAt
              )
            : '—',
      },

      {
        header: 'Actions',

        render: (c) =>
          c.status ===
          'PENDING' ? (
            <Button
              variant="outline"
              className="!py-1.5 !px-3 text-xs"
              onClick={() =>
                handleIssue(
                  c.id
                )
              }
              icon={
                <Send className="w-3.5 h-3.5" />
              }
            >
              Issue
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="!py-1.5 !px-3 text-xs"
                isLoading={
                  downloadingId ===
                  c.id
                }
                onClick={() =>
                  handleDownload(
                    c.id
                  )
                }
                icon={
                  <Download className="w-3.5 h-3.5" />
                }
              >
                Download
              </Button>

              <Button
                variant="ghost"
                className="!py-1.5 !px-3 text-xs"
                isLoading={
                  reissuingId ===
                  c.id
                }
                onClick={() =>
                  handleReissue(
                    c.id
                  )
                }
                icon={
                  <RefreshCcw className="w-3.5 h-3.5" />
                }
              >
                Regenerate
              </Button>
            </div>
          ),
      },
    ];

  return (
    <DashboardLayout
      links={links}
      title="Admin Portal"
      pageTitle="Certificates"
    >
      <div className="flex justify-end mb-5">
        <Button
          onClick={() =>
            setGenOpen(true)
          }
          icon={
            <Award className="w-4 h-4" />
          }
        >
          Generate
          Certificate
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={certificates}
        keyField={(c) =>
          c.id
        }
        emptyTitle="No certificates yet"
      />

      <Modal
        isOpen={genOpen}
        onClose={() =>
          setGenOpen(false)
        }
        title="Generate Certificate"
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Internship
            </label>

            <select
              className="input-field"
              value={
                selectedInternship
              }
              onChange={(e) => {
                setSelectedInternship(
                  e.target.value
                );

                setSelectedUser(
                  ''
                );
              }}
            >
              <option value="">
                Select
                internship…
              </option>

              {internships.map(
                (i) => (
                  <option
                    key={
                      i.id
                    }
                    value={
                      i.id
                    }
                  >
                    {
                      i.title
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="label">
              Student
            </label>

            <select
              className="input-field"
              value={
                selectedUser
              }
              onChange={(e) =>
                setSelectedUser(
                  e.target
                    .value
                )
              }
              disabled={
                !selectedInternship
              }
            >
              <option value="">
                Select
                student…
              </option>

              {participants.map(
                (r) => (
                  <option
                    key={
                      r.userId
                    }
                    value={
                      r.userId
                    }
                  >
                    {
                      r.user
                        .fullName
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <Button
            className="w-full"
            onClick={
              handleGenerate
            }
            disabled={
              !selectedInternship ||
              !selectedUser
            }
          >
            Create
            Certificate Record
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}