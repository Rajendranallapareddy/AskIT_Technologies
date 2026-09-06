import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import Button from '../../components/common/Button';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const emailFromUrl = params.get('email') || '';

  const [email, setEmail] = useState(emailFromUrl);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPassword(
        normalizedEmail,
        normalizedOtp,
        password
      );

      toast.success(
        'Password reset successfully. Please log in with your new password.'
      );

      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50 px-4">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-6">
          <span className="text-2xl font-extrabold">
            <span className="text-navy-800">ASK</span>
            <span className="text-orange-500">IT</span>
          </span>

          <KeyRound className="w-12 h-12 text-orange-500 mx-auto mt-5" />

          <h1 className="text-xl font-bold text-navy-900 mt-4">
            Reset Your Password
          </h1>

          <p className="text-sm text-navy-500 mt-2">
            Enter the OTP sent to your email and create a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="label">New Password</label>

            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="input-field"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Confirm New Password</label>

            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              className="input-field"
              placeholder="Re-enter your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            icon={<KeyRound className="w-4 h-4" />}
          >
            Reset Password
          </Button>
        </form>

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