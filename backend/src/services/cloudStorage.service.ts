import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME;

function getBucket() {
  if (!bucketName) {
    throw new Error(
      'GCS_BUCKET_NAME is not configured'
    );
  }

  return storage.bucket(bucketName);
}

export async function uploadProfilePictureToCloud(
  file: Express.Multer.File,
  userId: string
): Promise<string> {
  const bucket = getBucket();

  const ext =
    path.extname(file.originalname).toLowerCase() ||
    '.jpg';

  const objectPath =
    `profiles/${userId}/${uuidv4()}${ext}`;

  const cloudFile =
    bucket.file(objectPath);

  await cloudFile.save(file.buffer, {
    resumable: false,
    metadata: {
      contentType: file.mimetype,
      cacheControl: 'private, max-age=3600',
    },
  });

  // Store only the permanent object path in PostgreSQL.
  return objectPath;
}

export async function getProfilePictureSignedUrl(
  objectPath?: string | null
): Promise<string | null> {
  if (!objectPath) {
    return null;
  }

  // Support old external URLs if any already exist.
  if (
    objectPath.startsWith('http://') ||
    objectPath.startsWith('https://')
  ) {
    return objectPath;
  }

  // Old Cloud Run local uploads cannot be turned into
  // GCS signed URLs.
  if (objectPath.startsWith('/uploads/')) {
    return null;
  }

  const bucket = getBucket();

  const [signedUrl] =
    await bucket
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires:
          Date.now() +
          60 * 60 * 1000,
      });

  return signedUrl;
}

export async function deleteCloudFile(
  objectPath?: string | null
): Promise<void> {
  if (!objectPath) {
    return;
  }

  if (
    objectPath.startsWith('http://') ||
    objectPath.startsWith('https://') ||
    objectPath.startsWith('/uploads/')
  ) {
    return;
  }

  try {
    await getBucket()
      .file(objectPath)
      .delete({
        ignoreNotFound: true,
      });
  } catch (error) {
    console.error(
      '[STORAGE] Failed to delete object:',
      error
    );
  }
}