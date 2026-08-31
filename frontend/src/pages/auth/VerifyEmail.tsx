import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { authApi } from '../../api/endpoints';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) return setStatus('error');
    authApi.verifyEmail(token).then(() => setStatus('success')).catch(() => setStatus('error'));
  }, [token]);

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50">
      <div className="w-full max-w-md card p-8 text-center">
        {status === 'loading' && <p className="text-navy-500">Verifying your email…</p>}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold text-navy-900 mt-4">Email Verified!</h1>
            <p className="text-sm text-navy-500 mt-2">Your account is now active. You can log in.</p>
            <Link to="/login" className="btn-primary mt-6 inline-flex">Go to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-navy-900 mt-4">Verification Failed</h1>
            <p className="text-sm text-navy-500 mt-2">This link is invalid or has expired.</p>
            <Link to="/" className="btn-outline mt-6 inline-flex">Back to Home</Link>
          </>
        )}
      </div>
    </section>
  );
}
