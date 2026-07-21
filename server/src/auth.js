import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, IS_PROD, SESSION_SECRET } from './config.js';

/* ============================================================
   Session secret — env preferred (stable across rebuilds),
   else generated once and persisted to the data volume.
   ============================================================ */
const SECRET_PATH = path.join(DATA_DIR, '.session_secret');
function loadSecret() {
  if (SESSION_SECRET && SESSION_SECRET.length >= 16) return SESSION_SECRET;
  try {
    return fs.readFileSync(SECRET_PATH, 'utf8').trim();
  } catch {
    const s = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SECRET_PATH, s, { mode: 0o600 });
    return s;
  }
}
const SECRET = loadSecret();
const COOKIE = 'ddecor_session';
const MAX_AGE_S = 7 * 24 * 60 * 60; // 7 days

/* ============================================================
   Password hashing — scrypt (built into Node, no deps).
   Stored as  salt:hash  (hex).
   ============================================================ */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${key}`;
}
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const hashed = crypto.scryptSync(String(password), salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  return keyBuf.length === hashed.length && crypto.timingSafeEqual(keyBuf, hashed);
}

/* ============================================================
   Stateless signed token (JWT-style, HMAC-SHA256, no deps).
   ============================================================ */
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, email: user.email, role: user.role, iat: now, exp: now + MAX_AGE_S };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/* ============================================================
   Cookie helpers
   ============================================================ */
function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}
export function setSessionCookie(res, token) {
  const attrs = [`${COOKIE}=${token}`, 'HttpOnly', 'SameSite=Strict', 'Path=/', `Max-Age=${MAX_AGE_S}`];
  if (IS_PROD) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

/* ============================================================
   Middleware
   ============================================================ */
export function attachUser(req, _res, next) {
  const token = readCookie(req, COOKIE);
  const payload = token ? verifyToken(token) : null;
  req.auth = payload; // { sub, username, role } | null
  next();
}

export function requireAuth(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export function clientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '').trim();
}
