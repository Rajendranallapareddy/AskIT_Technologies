import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { authApi } from '../../api/endpoints';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const response =
        await authApi.forgotPassword(
          normalizedEmail
        );

      toast.success(
        response?.data?.message ||
          'Password reset OTP has been sent to your email.'
      );

      /*
       * IMPORTANT:
       * Go directly to the OTP + new password page.
       */
      navigate(
        `/reset-password?email=${encodeURIComponent(
          normalizedEmail
        )}`,
        {
          replace: true,
        }
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Unable to send password reset OTP. Please try again.';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
        {/* Brand */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#10244d]">
            ASK
            <span className="text-orange-500">
              IT
            </span>
          </h1>

          <h2 className="mt-3 text-xl font-semibold text-slate-900">
            Forgot Password
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Enter your registered email address.
            We'll send you a 6-digit verification OTP.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email Address
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                disabled={loading}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your registered email"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 py-3 font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Sending OTP...
              </>
            ) : (
              'Send Verification OTP'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}