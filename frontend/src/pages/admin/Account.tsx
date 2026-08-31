import { useEffect, useState } from 'react';
import { Save, KeyRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAdminLinks } from './_links';
import { authApi, superAdminApi } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import ProfilePictureUpload from '../../components/common/ProfilePictureUpload';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';

export default function AdminAccount() {
  const links = useAdminLinks();
  const { user, fetchMe } = useAuth();
  const [me, setMe] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', mobileNumber: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPw, setIsSavingPw] = useState(false);
  const toast = useToast();

  useEffect(() => {
    authApi.me().then((res) => {
      setMe(res.data.data);
      setProfileForm({ fullName: res.data.data.fullName, email: res.data.data.email, mobileNumber: res.data.data.mobileNumber });
    }).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    try {
      await superAdminApi.updateOwnProfile(profileForm);
      await fetchMe();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!pwForm.newPassword) return toast.error('Enter a new password');
    setIsSavingPw(true);
    try {
      await superAdminApi.updateOwnProfile({ ...profileForm, currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '' });
      toast.success('Password updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSavingPw(false);
    }
  };

  return (
    <DashboardLayout links={links} title="Admin Portal" pageTitle="My Account">
      {!me ? (
        <LoadingSpinner />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 max-w-3xl">
          <div className="card p-6 text-center h-fit">
            <ProfilePictureUpload name={me.fullName} pictureUrl={me.profilePicture} size={100} />
            <h3 className="font-bold text-navy-900 mt-4">{me.fullName}</h3>
            <p className="text-xs text-navy-500">{me.email}</p>
            <p className="text-xs text-navy-400 mt-1">{me.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sub Admin'}</p>
          </div>

          {user?.role === 'SUPER_ADMIN' ? (
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h3 className="font-bold text-navy-900 mb-4">Account Details</h3>
                <div className="space-y-4">
                  <div><label className="label">Full Name</label><input className="input-field" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} /></div>
                  <div><label className="label">Email</label><input className="input-field" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></div>
                  <div><label className="label">Mobile</label><input className="input-field" value={profileForm.mobileNumber} onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })} /></div>
                </div>
                <Button className="mt-5" onClick={handleProfileSave} isLoading={isSavingProfile} icon={<Save className="w-4 h-4" />}>Save Changes</Button>
              </div>

              <div className="card p-6">
                <h3 className="font-bold text-navy-900 mb-4">Change Password</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="label">Current Password</label><input type="password" className="input-field" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
                  <div><label className="label">New Password</label><input type="password" className="input-field" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} /></div>
                </div>
                <Button className="mt-5" onClick={handlePasswordSave} isLoading={isSavingPw} icon={<KeyRound className="w-4 h-4" />}>Update Password</Button>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 card p-6">
              <p className="text-sm text-navy-500">
                To change your name, email, or password, ask the Super Admin — Sub Admin account details are
                managed from the Sub Admins page. You can still update your own profile picture at any time.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
