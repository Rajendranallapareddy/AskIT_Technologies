import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import Button from '../../components/common/Button';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const emailFromUrl = params.get('email') || '';

  const [email, setEmail] = useState(emailFromUrl);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!normalizedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (!/^\d{6}$/.test(normalizedOtp)) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.verifyEmail(normalizedEmail, normalizedOtp);

      setVerified(true);
      toast.success('Email verified successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);

    try {
      await authApi.resendVerificationOtp(normalizedEmail);

      toast.success('A new OTP has been sent to your email');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50 px-4">
        <div className="w-full max-w-md card p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />

          <h1 className="text-2xl font-bold text-navy-900 mt-5">
            Email Verified!
          </h1>

          <p className="text-sm text-navy-500 mt-3">
            Your email has been verified successfully. Your account is now
            ready to use.
          </p>

          <Button
            type="button"
            className="w-full mt-6"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50 px-4">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-7">
          <span className="text-2xl font-extrabold">
            <span className="text-navy-800">ASK</span>
            <span className="text-orange-500">IT</span>
          </span>

          <MailCheck className="w-12 h-12 text-orange-500 mx-auto mt-5" />

          <h1 className="text-xl font-bold text-navy-900 mt-4">
            Verify Your Email
          </h1>

          <p className="text-sm text-navy-500 mt-2">
            Enter the 6-digit OTP sent to your registered email address.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="label">Email Address</label>

            <input
              required
              type="email"
              className="input-field"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label">6-Digit OTP</label>

            <input
              required
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="input-field text-center text-xl tracking-[0.4em] font-bold"
              placeholder="000000"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            icon={<MailCheck className="w-4 h-4" />}
          >
            Verify Email
          </Button>
        </form>

        <div className="text-center mt-5">
          <p className="text-sm text-navy-500">
            Didn't receive the OTP?
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="mt-1 text-sm text-orange-600 font-bold hover:underline disabled:opacity-50"
          >
            {isResending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>

        <p className="text-center text-sm text-navy-500 mt-6">
          <Link
            to="/login"
            className="text-orange-600 font-bold hover:underline"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </section>
  );
}