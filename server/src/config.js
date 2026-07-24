import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const CLIENT_DIST = process.env.CLIENT_DIST || path.resolve(ROOT, '..', 'client', 'dist');

export const PORT = Number(process.env.PORT) || 4000;
export const IS_PROD = process.env.NODE_ENV === 'production';

// Postgres
export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://ddecor:ddecor@localhost:5432/ddecor_id_studio';

// Platform-owner superadmin (seeded once from env, then hidden everywhere)
export const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
export const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || '';

// Stable session secret (env preferred so tokens survive restarts/rebuilds)
export const SESSION_SECRET = process.env.SESSION_SECRET || '';

// Upload limits
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_DIM = 2000;

// CORS dev origins (Vite)
export const DEV_ORIGINS = ['http://localhost:5197', 'http://127.0.0.1:5197'];

for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
