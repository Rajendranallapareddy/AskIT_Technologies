import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import Button from '../../components/common/Button';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset successfully. Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-6">
          <span className="text-2xl font-extrabold"><span className="text-navy-800">ASK</span><span className="text-orange-500">IT</span></span>
          <h1 className="text-xl font-bold text-navy-900 mt-4">Reset Your Password</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">New Password</label><input required type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div><label className="label">Confirm New Password</label><input required type="password" className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <Button type="submit" className="w-full" isLoading={isLoading} icon={<KeyRound className="w-4 h-4" />}>Reset Password</Button>
        </form>
        <p className="text-center text-sm text-navy-500 mt-6"><Link to="/login" className="text-orange-600 font-bold hover:underline">Back to Login</Link></p>
      </div>
    </section>
  );
}
