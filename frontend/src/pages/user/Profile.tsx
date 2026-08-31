import { useEffect, useState } from 'react';
import { Save, KeyRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { USER_LINKS } from './_links';
import { userApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProfilePictureUpload from '../../components/common/ProfilePictureUpload';

export default function Profile() {
  const [form, setForm] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPw, setIsChangingPw] = useState(false);
  const { fetchMe } = useAuth();
  const toast = useToast();

  useEffect(() => {
    userApi.profile().then((res) => setForm(res.data.data)).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await userApi.updateProfile(form);
      await fetchMe();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    setIsChangingPw(true);
    try {
      await userApi.changePassword(pwForm);
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <DashboardLayout links={USER_LINKS} title="Student Portal" pageTitle="My Profile">
      {!form ? (
        <LoadingSpinner />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6 text-center h-fit">
            <ProfilePictureUpload name={form.fullName} pictureUrl={form.profilePicture} size={96} />
            <h3 className="font-bold text-navy-900 mt-4">{form.fullName}</h3>
            <p className="text-xs text-navy-500">{form.email}</p>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4">Edit Profile</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="label">Full Name</label><input className="input-field" value={form.fullName || ''} onChange={update('fullName')} /></div>
                <div><label className="label">College</label><input className="input-field" value={form.collegeName || ''} onChange={update('collegeName')} /></div>
                <div><label className="label">University</label><input className="input-field" value={form.university || ''} onChange={update('university')} /></div>
                <div><label className="label">Degree</label><input className="input-field" value={form.degree || ''} onChange={update('degree')} /></div>
                <div><label className="label">Branch</label><input className="input-field" value={form.branch || ''} onChange={update('branch')} /></div>
                <div><label className="label">City</label><input className="input-field" value={form.city || ''} onChange={update('city')} /></div>
                <div><label className="label">State</label><input className="input-field" value={form.state || ''} onChange={update('state')} /></div>
                <div><label className="label">Country</label><input className="input-field" value={form.country || ''} onChange={update('country')} /></div>
              </div>
              <div className="mt-4"><label className="label">Address</label><input className="input-field" value={form.address || ''} onChange={update('address')} /></div>
              <Button type="submit" className="mt-5" isLoading={isSaving} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
            </form>

            <form onSubmit={handlePasswordChange} className="card p-6">
              <h3 className="font-bold text-navy-900 mb-4">Change Password</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className="label">Current</label><input type="password" required className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
                <div><label className="label">New</label><input type="password" required className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} /></div>
                <div><label className="label">Confirm</label><input type="password" required className="input-field" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} /></div>
              </div>
              <Button type="submit" className="mt-5" isLoading={isChangingPw} icon={<KeyRound className="w-4 h-4" />}>Update Password</Button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
