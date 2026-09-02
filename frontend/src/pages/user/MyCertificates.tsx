import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { userApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import {
  Award,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import type { Certificate } from '../../types';

export default function MyCertificates() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } =
    useApiQuery<Certificate[]>(
      () =>
        userApi.certificates()
    );

  const toast =
    useToast();

  const [
    downloadingId,
    setDownloadingId,
  ] =
    useState<string | null>(
      null
    );

  const downloadCertificate =
    async (
      certificateId: string
    ) => {
      if (downloadingId) {
        return;
      }

      setDownloadingId(
        certificateId
      );

      try {
        const response =
          await userApi.downloadCertificate(
            certificateId
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

  return (
    <DashboardLayout
      links={USER_LINKS}
      title="Student Portal"
      pageTitle="My Certificates"
    >
      {isLoading || !data ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={refetch}
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon={
            <Award className="w-8 h-8" />
          }
          title="No certificates yet"
          description="Complete an internship to earn your first certificate."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((c) => (
            <div
              key={c.id}
              className="card p-6 text-center relative overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy-700 via-orange-500 to-navy-700" />

              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center">
                <Award
                  className={`w-9 h-9 ${
                    c.status ===
                    'ISSUED'
                      ? 'text-orange-500'
                      : 'text-navy-300'
                  }`}
                />
              </div>

              <h3 className="font-bold text-navy-900 mt-4">
                {
                  c.internship
                    .title
                }
              </h3>

              <p className="text-xs text-navy-400 mt-1 font-mono">
                {
                  c.certificateNo
                }
              </p>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-navy-500">
                <ShieldCheck className="w-3.5 h-3.5" />

                {c.status ===
                'ISSUED'
                  ? `Issued ${formatDate(
                      c.issuedAt
                    )}`
                  : 'Pending approval'}
              </div>

              {c.status ===
                'ISSUED' && (
                <Button
                  variant="outline"
                  className="w-full mt-5 !py-2 text-xs"
                  icon={
                    <Download className="w-3.5 h-3.5" />
                  }
                  isLoading={
                    downloadingId ===
                    c.id
                  }
                  onClick={() =>
                    downloadCertificate(
                      c.id
                    )
                  }
                >
                  Download
                  Certificate
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}