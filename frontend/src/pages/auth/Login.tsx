import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { ROLE_HOME } from '../../utils/constants';
import Button from '../../components/common/Button';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await authApi.login(form);
      const { user, accessToken } = res.data.data;
      login(accessToken, user);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      const redirectTo = (location.state as any)?.from || ROLE_HOME[user.role] || '/';
      navigate(redirectTo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-8">
          <span className="text-2xl font-extrabold"><span className="text-navy-800">ASK</span><span className="text-orange-500">IT</span></span>
          <h1 className="text-xl font-bold text-navy-900 mt-4">Welcome Back</h1>
          <p className="text-sm text-navy-500 mt-1">Log in to continue your learning journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" />
              <input required type="email" className="input-field pl-11" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" />
              <input required type={showPassword ? 'text' : 'password'} className="input-field pl-11 pr-11" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-navy-600">
              <input type="checkbox" checked={form.rememberMe} onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })} className="rounded border-navy-300" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-orange-600 font-semibold hover:underline">Forgot password?</Link>
          </div>
          <Button type="submit" className="w-full" isLoading={isLoading} icon={<LogIn className="w-4 h-4" />}>Log In</Button>
        </form>

        <p className="text-center text-sm text-navy-500 mt-6">
          Don't have an account? <Link to="/register" className="text-orange-600 font-bold hover:underline">Register Now</Link>
        </p>
      </div>
    </section>
  );
}
