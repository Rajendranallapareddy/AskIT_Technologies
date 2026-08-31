import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import Button from '../../components/common/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50">
      <div className="w-full max-w-md card p-8 text-center">
        <span className="text-2xl font-extrabold"><span className="text-navy-800">ASK</span><span className="text-orange-500">IT</span></span>
        <h1 className="text-xl font-bold text-navy-900 mt-4">Forgot Password</h1>
        {sent ? (
          <p className="text-sm text-navy-600 mt-4">If an account exists for <b>{email}</b>, we've sent a password reset link to it.</p>
        ) : (
          <>
            <p className="text-sm text-navy-500 mt-1 mb-6">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="text-left space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input required type="email" className="input-field pl-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" isLoading={isLoading} icon={<Send className="w-4 h-4" />}>Send Reset Link</Button>
            </form>
          </>
        )}
        <p className="text-sm text-navy-500 mt-6"><Link to="/login" className="text-orange-600 font-bold hover:underline">Back to Login</Link></p>
      </div>
    </section>
  );
}
