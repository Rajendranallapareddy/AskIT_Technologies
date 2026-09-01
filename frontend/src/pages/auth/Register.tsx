import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { passwordStrength } from '../../utils/validators';
import Button from '../../components/common/Button';

const emptyForm = {
  fullName: '',
  email: '',
  mobileNumber: '',
  password: '',
  confirmPassword: '',
  gender: '',
  dateOfBirth: '',
  collegeName: '',
  university: '',
  degree: '',
  branch: '',
  graduationYear: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
};

export default function Register() {
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const strength = passwordStrength(form.password);

  const update =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm({ ...form, [key]: e.target.value });
    };

  const getRegistrationError = (err: any): string => {
    const data = err?.response?.data;

    // Backend validation errors.
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors
        .map((error: any) => error.message)
        .filter(Boolean)
        .join('. ');
    }

    // Backend AppError messages such as duplicate email/mobile.
    if (data?.message && data.message !== 'Validation failed') {
      return data.message;
    }

    // Network / server errors.
    if (!err?.response) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    if (err.response.status === 409) {
      return 'An account with this email or mobile number already exists. Please log in instead.';
    }

    if (err.response.status === 429) {
      return 'Too many registration attempts. Please wait a few minutes and try again.';
    }

    if (err.response.status >= 500) {
      return 'Something went wrong while creating your account. Please try again later.';
    }

    return 'Please check the entered details and try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!form.email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobileNumber.trim())) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!form.gender) {
      toast.error('Please select your gender');
      return;
    }

    if (!form.dateOfBirth) {
      toast.error('Please enter your date of birth');
      return;
    }

    const dob = new Date(form.dateOfBirth);
    const today = new Date();

    if (dob > today) {
      toast.error('Date of birth cannot be in the future');
      return;
    }

    if (!form.graduationYear) {
      toast.error('Please enter your graduation year');
      return;
    }

    const graduationYear = Number(form.graduationYear);

    if (
      !Number.isInteger(graduationYear) ||
      graduationYear < 1950 ||
      graduationYear > today.getFullYear() + 10
    ) {
      toast.error('Please enter a valid graduation year');
      return;
    }

    if (!form.collegeName.trim()) {
      toast.error('Please enter your college name');
      return;
    }

    if (!form.university.trim()) {
      toast.error('Please enter your university');
      return;
    }

    if (!form.degree.trim()) {
      toast.error('Please enter your degree');
      return;
    }

    if (!form.branch.trim()) {
      toast.error('Please enter your branch');
      return;
    }

    if (!form.city.trim()) {
      toast.error('Please enter your city');
      return;
    }

    if (!form.state.trim()) {
      toast.error('Please enter your state');
      return;
    }

    if (!form.address.trim()) {
      toast.error('Please enter your address');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Password must contain at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(form.password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(form.password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(form.password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    if (!/[^A-Za-z0-9]/.test(form.password)) {
      toast.error('Password must contain at least one special character');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.register(form);

      // Clear the registration form after successful account creation.
      setForm(emptyForm);

      toast.success('Account created successfully. Please login.');

      // Small delay so the user can clearly see the success message.
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (err) {
      toast.error(getRegistrationError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center py-16 bg-navy-50/50">
      <div className="w-full max-w-2xl card p-8">
        <div className="text-center mb-8">
          <span className="text-2xl font-extrabold">
            <span className="text-navy-800">ASK</span>
            <span className="text-orange-500">IT</span>
          </span>

          <h1 className="text-xl font-bold text-navy-900 mt-4">
            Create Your Account
          </h1>

          <p className="text-sm text-navy-500 mt-1">
            Start your journey toward a career in tech
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                required
                className="input-field"
                value={form.fullName}
                onChange={update('fullName')}
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                required
                type="email"
                className="input-field"
                value={form.email}
                onChange={update('email')}
              />
            </div>

            <div>
              <label className="label">Mobile Number</label>
              <input
                required
                type="tel"
                maxLength={10}
                className="input-field"
                value={form.mobileNumber}
                onChange={update('mobileNumber')}
                placeholder="10-digit number"
              />
            </div>

            <div>
              <label className="label">Gender</label>
              <select
                required
                className="input-field"
                value={form.gender}
                onChange={update('gender')}
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Date of Birth</label>
              <input
                required
                type="date"
                max={new Date().toISOString().split('T')[0]}
                className="input-field"
                value={form.dateOfBirth}
                onChange={update('dateOfBirth')}
              />
            </div>

            <div>
              <label className="label">Graduation Year</label>
              <input
                required
                type="number"
                min="1950"
                max={new Date().getFullYear() + 10}
                className="input-field"
                value={form.graduationYear}
                onChange={update('graduationYear')}
                placeholder="e.g. 2025"
              />
            </div>

            <div>
              <label className="label">College Name</label>
              <input
                required
                className="input-field"
                value={form.collegeName}
                onChange={update('collegeName')}
              />
            </div>

            <div>
              <label className="label">University</label>
              <input
                required
                className="input-field"
                value={form.university}
                onChange={update('university')}
              />
            </div>

            <div>
              <label className="label">Degree</label>
              <input
                required
                className="input-field"
                value={form.degree}
                onChange={update('degree')}
                placeholder="B.Tech, BCA..."
              />
            </div>

            <div>
              <label className="label">Branch</label>
              <input
                required
                className="input-field"
                value={form.branch}
                onChange={update('branch')}
                placeholder="CSE, IT, AIML..."
              />
            </div>

            <div>
              <label className="label">City</label>
              <input
                required
                className="input-field"
                value={form.city}
                onChange={update('city')}
              />
            </div>

            <div>
              <label className="label">State</label>
              <input
                required
                className="input-field"
                value={form.state}
                onChange={update('state')}
              />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <input
              required
              className="input-field"
              value={form.address}
              onChange={update('address')}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Password</label>

              <input
                required
                type="password"
                className="input-field"
                value={form.password}
                onChange={update('password')}
              />

              {form.password && (
                <div className="mt-1.5 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < strength.score
                          ? 'bg-orange-500'
                          : 'bg-navy-100'
                      }`}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-navy-400 mt-1">
                Min 8 chars, uppercase, lowercase, number & symbol
              </p>
            </div>

            <div>
              <label className="label">Confirm Password</label>

              <input
                required
                type="password"
                className="input-field"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-navy-500 mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-orange-600 font-bold hover:underline"
          >
            Log In
          </Link>
        </p>
      </div>
    </section>
  );
}