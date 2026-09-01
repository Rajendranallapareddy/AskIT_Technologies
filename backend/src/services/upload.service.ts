import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_ROOT = path.join(
  process.cwd(),
  'uploads'
);

function ensureDir(dir: string) {
  const full = path.join(
    UPLOAD_ROOT,
    dir
  );

  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, {
      recursive: true,
    });
  }

  return full;
}

function makeStorage(subDir: string) {
  return multer.diskStorage({
    destination: (
      _req,
      _file,
      cb
    ) =>
      cb(
        null,
        ensureDir(subDir)
      ),

    filename: (
      _req,
      file,
      cb
    ) => {
      const ext =
        path.extname(
          file.originalname
        );

      cb(
        null,
        `${uuidv4()}${ext}`
      );
    },
  });
}

const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: any
) => {
  const allowed =
    /jpeg|jpg|png|webp/;

  const ok =
    allowed.test(
      path
        .extname(
          file.originalname
        )
        .toLowerCase()
    ) &&
    allowed.test(
      file.mimetype
    );

  cb(
    ok
      ? null
      : new Error(
          'Only image files (jpg, jpeg, png, webp) are allowed'
        ),
    ok
  );
};

// PROFILE PICTURES MUST USE MEMORY.
// The controller uploads them to Google Cloud Storage.
export const uploadProfilePicture =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        3 * 1024 * 1024,
    },

    fileFilter:
      imageFileFilter,
  });

export const uploadTrainerPhoto =
  multer({
    storage:
      makeStorage('trainers'),

    limits: {
      fileSize:
        3 * 1024 * 1024,
    },

    fileFilter:
      imageFileFilter,
  });

export const uploadGalleryImage =
  multer({
    storage:
      makeStorage('gallery'),

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter:
      imageFileFilter,
  });

export const uploadQrCode =
  multer({
    storage:
      makeStorage('qrcodes'),

    limits: {
      fileSize:
        3 * 1024 * 1024,
    },

    fileFilter:
      imageFileFilter,
  });

export const uploadCourseImage =
  multer({
    storage:
      makeStorage('courses'),

    limits: {
      fileSize:
        3 * 1024 * 1024,
    },

    fileFilter:
      imageFileFilter,
  });

export const uploadMaterial =
  multer({
    storage:
      makeStorage('materials'),

    limits: {
      fileSize:
        20 * 1024 * 1024,
    },
  });