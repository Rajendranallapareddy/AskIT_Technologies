import { useState } from 'react';
import { Award, Download, Loader2 } from 'lucide-react';

import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

import { USER_LINKS } from './_links';
import { useApiQuery } from '../../hooks/useQuery';
import { useToast } from '../../hooks/useToast';

import { userApi } from '../../api/endpoints';

import { formatDate } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/helpers';

import type { Certificate } from '../../types';

export default function MyCertificates() {
  const {
    data,
    isLoading,
  } = useApiQuery<Certificate[]>(
    () => userApi.certificates()
  );

  const toast = useToast();

  const [
    downloadingId,
    setDownloadingId,
  ] = useState<string | null>(null);

  const handleDownload = async (
    certificate: Certificate
  ) => {
    if (downloadingId) return;

    try {
      setDownloadingId(certificate.id);

      const response =
        await userApi.downloadCertificate(
          certificate.id
        );

      const blob = new Blob(
        [response.data],
        {
          type: 'application/pdf',
        }
      );

      const blobUrl =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = blobUrl;

      link.download =
        `${certificate.certificateNo}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      // Give the browser a moment to start
      // reading the blob before removing it.
      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      toast.error(
        getErrorMessage(err)
      );
    } finally {
      setDownloadingId(null);
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
          {data.map((certificate) => {
            const isDownloading =
              downloadingId === certificate.id;

            return (
              <div
                key={certificate.id}
                className="card p-6 text-center"
              >
                <Award
                  className={`w-10 h-10 mx-auto ${
                    certificate.status ===
                    'ISSUED'
                      ? 'text-orange-500'
                      : 'text-navy-300'
                  }`}
                />

                <h3 className="font-bold text-navy-900 mt-3">
                  {
                    certificate.internship
                      .title
                  }
                </h3>

                <p className="text-xs text-navy-400 mt-1">
                  #
                  {
                    certificate.certificateNo
                  }
                </p>

                <p className="text-xs text-navy-500 mt-1">
                  {certificate.status ===
                  'ISSUED'
                    ? `Issued ${formatDate(
                        certificate.issuedAt
                      )}`
                    : 'Pending approval'}
                </p>

                {certificate.status ===
                  'ISSUED' && (
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() =>
                      handleDownload(
                        certificate
                      )
                    }
                    className="btn-outline w-full mt-4 !py-2 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Download Certificate
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}