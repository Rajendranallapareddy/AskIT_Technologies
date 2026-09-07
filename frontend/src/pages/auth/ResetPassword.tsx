import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { authApi } from '../../api/endpoints';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const queryEmail =
    searchParams.get('email') || '';

  const [email, setEmail] =
    useState(queryEmail);

  const [otp, setOtp] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    resending,
    setResending,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [cooldown, setCooldown] =
    useState(0);

  /*
   * Resend countdown.
   */
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setCooldown((current) =>
          current <= 1
            ? 0
            : current - 1
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [cooldown]);

  const normalizedEmail =
    email.trim().toLowerCase();

  const handleOtpChange = (
    value: string
  ) => {
    /*
     * Allow digits only.
     */
    const digits =
      value.replace(/\D/g, '');

    setOtp(digits.slice(0, 6));
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!normalizedEmail) {
      toast.error(
        'Email address is required.'
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      toast.error(
        'Please enter the 6-digit OTP.'
      );
      return;
    }

    if (password.length < 8) {
      toast.error(
        'New password must contain at least 8 characters.'
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      toast.error(
        'New password and confirm password do not match.'
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await authApi.resetPassword(
          normalizedEmail,
          otp,
          password
        );

      toast.success(
        response?.data?.message ||
          'Password changed successfully.'
      );

      /*
       * After successful password reset,
       * take the user back to Login.
       */
      setTimeout(() => {
        navigate('/login', {
          replace: true,
        });
      }, 1200);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Unable to reset password. Please check your OTP and try again.';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /*
   * Request another password reset OTP.
   *
   * The same forgot-password endpoint
   * generates a fresh OTP.
   */
  const handleResendOtp =
    async () => {
      if (!normalizedEmail) {
        toast.error(
          'Email address is required.'
        );
        return;
      }

      if (
        resending ||
        cooldown > 0
      ) {
        return;
      }

      setResending(true);

      try {
        const response =
          await authApi.forgotPassword(
            normalizedEmail
          );

        toast.success(
          response?.data?.message ||
            'A new password reset OTP has been sent.'
        );

        /*
         * Old OTP is replaced by the new OTP.
         */
        setOtp('');
        setCooldown(60);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          'Unable to resend OTP. Please try again.';

        toast.error(message);
      } finally {
        setResending(false);
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
            Reset Password
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Enter the 6-digit OTP sent
            to your email and create
            your new password.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Email */}
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
                required
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* OTP */}
          <div>
            <label
              htmlFor="otp"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Verification OTP
            </label>

            <div className="relative">
              <KeyRound
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) =>
                  handleOtpChange(
                    e.target.value
                  )
                }
                placeholder="Enter 6-digit OTP"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-center text-lg font-semibold tracking-[0.35em] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              New Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                required
                minLength={8}
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-11 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm New Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-11 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={
                  showConfirmPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
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

                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Resend OTP */}
        <div className="mt-5 text-center">
          <p className="text-sm text-slate-500">
            Didn't receive the OTP?
          </p>

          <button
            type="button"
            onClick={
              handleResendOtp
            }
            disabled={
              resending ||
              cooldown > 0
            }
            className="mt-1 text-sm font-semibold text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {resending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend OTP in ${cooldown}s`
                : 'Resend OTP'}
          </button>
        </div>

        <div className="mt-5 text-center">
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