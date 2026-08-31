import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import { formatDate } from '../../utils/formatters';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function VerifyCertificate() {
  const { certificateNo } = useParams();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (certificateNo) publicApi.verifyCertificate(certificateNo).then((res) => setResult(res.data.data)).catch(() => setResult({ valid: false }));
  }, [certificateNo]);

  return (
    <>
      <Seo title="Certificate Verification" description="Confirm the authenticity of an ASK IT Technologies completion certificate." path={`/verify-certificate/${certificateNo || ''}`} noIndex />
      <PageHeader title="Certificate Verification" subtitle="Confirm the authenticity of an ASK IT completion certificate." />
      <section className="py-16">
        <div className="container-page max-w-lg">
          {result === null ? (
            <LoadingSpinner />
          ) : result.valid ? (
            <div className="card p-8 text-center">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-navy-900 mt-4">Certificate Verified</h2>
              <p className="text-sm text-navy-500 mt-1">This is a genuine ASK IT Technologies certificate.</p>
              <div className="mt-6 text-left space-y-3 text-sm border-t border-navy-100 pt-5">
                <Row label="Certificate No." value={certificateNo || ''} />
                <Row label="Student" value={result.studentName} />
                <Row label="Program" value={result.internshipTitle} />
                <Row label="Issued On" value={formatDate(result.issuedAt)} />
              </div>
              <p className="text-xs text-navy-400 mt-6 flex items-center justify-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Verified via secure QR code</p>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <XCircle className="w-14 h-14 text-red-500 mx-auto" />
              <h2 className="text-xl font-bold text-navy-900 mt-4">Not a Valid Certificate</h2>
              <p className="text-sm text-navy-500 mt-1">We couldn't verify this certificate. It may be invalid or not yet issued.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-400">{label}</span>
      <span className="font-semibold text-navy-800 text-right">{value}</span>
    </div>
  );
}
