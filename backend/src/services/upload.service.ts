import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

// Split uploads by kind so profile pics, certificates, gallery, etc. stay organized.
function ensureDir(dir: string) {
  const full = path.join(UPLOAD_ROOT, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  return full;
}

function makeStorage(subDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureDir(subDir)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

// The `cb` parameter is intentionally typed as `any` here. Multer's real
// FileFilterCallback type is an *overloaded* signature — a different shape
// when passing an error vs. not — and hand-writing a single signature that
// matches both overloads exactly breaks across different @types/multer
// versions (that's what caused the TS2322 build error). Typing it `any`
// sidesteps that version-specific fragility entirely while the runtime
// behavior (call cb with an Error to reject, or null+boolean to accept)
// stays exactly what Multer expects.
const imageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  cb(ok ? null : new Error('Only image files (jpg, jpeg, png, webp) are allowed'), ok);
};

export const uploadProfilePicture = multer({
  storage: makeStorage('profiles'),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadTrainerPhoto = multer({
  storage: makeStorage('trainers'),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadGalleryImage = multer({
  storage: makeStorage('gallery'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadQrCode = multer({
  storage: makeStorage('qrcodes'),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadCourseImage = multer({
  storage: makeStorage('courses'),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadMaterial = multer({
  storage: makeStorage('materials'),
  limits: { fileSize: 20 * 1024 * 1024 },
});
