import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { UPLOADS_DIR, MAX_UPLOAD_BYTES, MAX_IMAGE_DIM } from '../config.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// In-memory buffer → we fully re-encode with sharp, so nothing untrusted hits disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.mimetype)) cb(null, true);
    else cb(Object.assign(new Error('Only image files are allowed.'), { status: 415 }));
  },
});

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received.' });

    // Re-encode: this validates the image, strips EXIF/ICC/scripts, and normalises orientation.
    const pipeline = sharp(req.file.buffer, { failOn: 'error' })
      .rotate() // apply EXIF orientation, then metadata is dropped
      .resize({
        width: MAX_IMAGE_DIM,
        height: MAX_IMAGE_DIM,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    const id = nanoid(16);
    const filename = `${id}.jpg`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), data);

    res.status(201).json({
      id,
      url: `/api/uploads/${filename}`,
      width: info.width,
      height: info.height,
      bytes: data.length,
    });
  } catch (err) {
    if (err?.message?.includes('unsupported image')) err.status = 415;
    next(err);
  }
});

// ---- LOGO upload: auto-crop (trim surrounding whitespace/transparency), keep transparency ----
router.post('/logo', upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received.' });

    const base = sharp(req.file.buffer, { failOn: 'error' }).rotate();
    const finish = (pipe) =>
      pipe
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer({ resolveWithObject: true });

    // Trim the uniform border (works for white or transparent backgrounds).
    // If the image is effectively blank, trimming throws — fall back to the untrimmed image.
    let out;
    try {
      out = await finish(base.clone().trim({ threshold: 12 }));
    } catch {
      out = await finish(base.clone());
    }

    const id = nanoid(16);
    const filename = `${id}.png`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), out.data);
    res.status(201).json({ id, url: `/api/uploads/${filename}`, width: out.info.width, height: out.info.height });
  } catch (err) {
    if (err?.message?.includes('unsupported image')) err.status = 415;
    next(err);
  }
});

export default router;
