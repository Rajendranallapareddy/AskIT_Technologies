import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck, RefreshCw } from 'lucide-react';

import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/common/Button';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();

  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState(
    searchParams.get('email') || ''
  );

  const [otp, setOtp] = useState('');

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

  const [resendSeconds, setResendSeconds] =
    useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendSeconds]);

  const getErrorMessage = (
    err: any,
    fallback: string
  ) => {
    const data = err?.response?.data;

    if (
      Array.isArray(data?.errors) &&
      data.errors.length > 0
    ) {
      return data.errors
        .map((error: any) => error.message)
        .filter(Boolean)
        .join('. ');
    }

    if (data?.message) {
      return data.message;
    }

    if (!err?.response) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    return fallback;
  };

  const handleOtpChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      e.target.value
        .replace(/\D/g, '')
        .slice(0, 6);

    setOtp(value);
  };

  const handleVerify = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    const cleanOtp =
      otp.trim();

    if (!normalizedEmail) {
      toast.error(
        'Email address is missing. Please register again.'
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      toast.error(
        'Please enter a valid email address.'
      );
      return;
    }

    if (!cleanOtp) {
      toast.error(
        'Please enter the verification OTP.'
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error(
        'Please enter a valid 6-digit OTP.'
      );
      return;
    }

    setIsVerifying(true);

    try {
      const response =
        await authApi.verifyEmail(
          normalizedEmail,
          cleanOtp
        );

      toast.success(
        response?.data?.message ||
          'Email verified successfully. Your account has been created.'
      );

      setTimeout(() => {
        navigate(
          '/login',
          {
            replace: true,
          }
        );
      }, 1200);
    } catch (err: any) {
      toast.error(
        getErrorMessage(
          err,
          'Unable to verify OTP. Please try again.'
        )
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error(
        'Email address is missing. Please register again.'
      );
      return;
    }

    if (resendSeconds > 0) {
      return;
    }

    setIsResending(true);

    try {
      const response =
        await authApi.resendVerificationOtp(
          normalizedEmail
        );

      toast.success(
        response?.data?.message ||
          'A new verification OTP has been sent to your email.'
      );

      setOtp('');

      setResendSeconds(60);
    } catch (err: any) {
      toast.error(
        getErrorMessage(
          err,
          'Unable to resend OTP. Please try again.'
        )
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 px-4 bg-navy-50/50">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <MailCheck className="w-7 h-7 text-orange-500" />
          </div>

          <h1 className="text-2xl font-bold text-navy-900">
            Verify Your Email
          </h1>

          <p className="text-sm text-navy-500 mt-2">
            Enter the 6-digit OTP sent to your email
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="space-y-5"
        >
          <div>
            <label className="label">
              Email Address
            </label>

            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label">
              Verification OTP
            </label>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="input-field text-center text-xl tracking-[0.35em] font-bold"
              value={otp}
              onChange={handleOtpChange}
              placeholder="000000"
              required
            />

            <p className="text-xs text-navy-400 mt-2">
              Enter the latest 6-digit OTP sent to your email.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isVerifying}
            disabled={
              isVerifying ||
              otp.length !== 6
            }
            icon={
              <MailCheck className="w-4 h-4" />
            }
          >
            Verify Email
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-navy-500">
            Didn't receive the OTP?
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={
              isResending ||
              resendSeconds > 0
            }
            className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isResending
                  ? 'animate-spin'
                  : ''
              }`}
            />

            {isResending
              ? 'Sending...'
              : resendSeconds > 0
              ? `Resend OTP in ${resendSeconds}s`
              : 'Resend OTP'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-navy-100 text-center">
          <Link
            to="/register"
            className="text-sm text-navy-500 hover:text-orange-600"
          >
            Use another email? Register again
          </Link>
        </div>
      </div>
    </section>
  );
}