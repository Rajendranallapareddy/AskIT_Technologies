import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { TRAINER_LINKS } from './_links';
import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import ProfilePictureUpload from '../../components/common/ProfilePictureUpload';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function TrainerAccount() {
  const [me, setMe] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    authApi.me().then((res) => setMe(res.data.data)).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout links={TRAINER_LINKS} title="Trainer Portal" pageTitle="My Account">
      {!me ? (
        <LoadingSpinner />
      ) : (
        <div className="max-w-md card p-6 text-center">
          <ProfilePictureUpload name={me.fullName} pictureUrl={me.profilePicture} size={110} />
          <h3 className="font-bold text-navy-900 mt-4 text-lg">{me.fullName}</h3>
          <p className="text-sm text-navy-500 mt-1">{me.email}</p>
          <p className="text-sm text-navy-500">{me.mobileNumber}</p>
          {me.trainerProfile && (
            <div className="mt-5 pt-5 border-t border-navy-100 text-left space-y-2 text-sm">
              <p><span className="text-navy-400">Experience:</span> <span className="font-semibold">{me.trainerProfile.experienceYears} years</span></p>
              {me.trainerProfile.expertise?.length > 0 && (
                <p><span className="text-navy-400">Expertise:</span> <span className="font-semibold">{me.trainerProfile.expertise.join(', ')}</span></p>
              )}
              {me.trainerProfile.bio && <p><span className="text-navy-400">Bio:</span> {me.trainerProfile.bio}</p>}
              <p className="text-xs text-navy-400 pt-2">To update your name, expertise, or bio, ask an admin — they manage trainer profiles under Admin → Trainers.</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
