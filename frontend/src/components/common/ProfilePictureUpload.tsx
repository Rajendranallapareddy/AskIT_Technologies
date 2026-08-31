import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { initials } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { getImageUrl } from '../../utils/imageUrl';

interface ProfilePictureUploadProps {
  name: string;
  pictureUrl?: string | null;
  size?: number;
}

/**
 * Converts a profile-picture path returned by the backend
 * into a complete URL that the browser can load.
 *
 * Example:
 * VITE_API_URL =
 * https://your-backend.onrender.com/api
 *
 * Backend returns:
 * /uploads/profiles/photo.jpg
 *
 * Final image URL:
 * https://your-backend.onrender.com/uploads/profiles/photo.jpg
 */


/**
 * Shared profile-picture uploader.
 *
 * Used by:
 * - Students
 * - Trainers
 * - Sub Admins
 * - Super Admin
 */
export default function ProfilePictureUpload({
  name,
  pictureUrl,
  size = 96,
}: ProfilePictureUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    getImageUrl(pictureUrl)
  );

  const [isUploading, setIsUploading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const toast = useToast();

  const { fetchMe } = useAuth();

  /**
   * Handles profile-picture selection and upload.
   *
   * The selected image is displayed immediately using
   * URL.createObjectURL(), so the user doesn't have to
   * wait for the Render backend upload to finish before
   * seeing the new picture.
   */
  const handleFile = async (file: File) => {
    // Validate file type.
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    // Save the previous image in case the upload fails.
    const previousPreview = preview;

    // Create a temporary local browser URL.
    // This lets us show the image instantly.
    const localPreview = URL.createObjectURL(file);

    setPreview(localPreview);
    setIsUploading(true);

    try {
      // Upload image to backend.
      const res = await authApi.updateProfilePicture(file);

      const uploadedPicture = res.data.data.profilePicture;

      // Convert backend relative path to full Render URL.
      const uploadedImageUrl = getImageUrl(uploadedPicture);

      // Replace temporary preview with permanent backend URL.
      setPreview(uploadedImageUrl);

      // Refresh authenticated user information so the
      // navbar/sidebar/avatar elsewhere also gets updated.
      await fetchMe();

      toast.success('Profile picture updated');
    } catch (err) {
      // Upload failed, so restore the previous picture.
      setPreview(previousPreview);

      toast.error(getErrorMessage(err));
    } finally {
      // Clean up temporary browser URL.
      URL.revokeObjectURL(localPreview);

      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => {
          if (!isUploading) {
            inputRef.current?.click();
          }
        }}
        disabled={isUploading}
        className="relative rounded-full overflow-hidden group focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:cursor-wait"
        style={{
          width: size,
          height: size,
        }}
        title="Click to change photo"
      >
        {preview ? (
          <img
            src={preview}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => {
              console.error(
                'Failed to load profile picture:',
                preview
              );
            }}
          />
        ) : (
          <div
            className="w-full h-full bg-navy-700 text-white flex items-center justify-center font-bold"
            style={{
              fontSize: size / 3,
            }}
          >
            {initials(name)}
          </div>
        )}

        {/* Hover / uploading overlay */}
        <div
          className={`
            absolute inset-0
            bg-black/50
            transition
            flex items-center
            justify-center
            ${
              isUploading
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }
          `}
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) {
            handleFile(file);
          }

          // Reset input so selecting the same image again works.
          e.target.value = '';
        }}
      />

      <p className="text-xs text-navy-400 mt-2">
        {isUploading ? 'Uploading...' : 'Click photo to change'}
      </p>
    </div>
  );
}