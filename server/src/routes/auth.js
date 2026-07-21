import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Users, Audit } from '../db.js';
import {
  verifyPassword,
  hashPassword,
  issueToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  clientIp,
} from '../auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait and try again.' },
});

const publicOf = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const ip = clientIp(req);
    const row = email ? await Users.rawByEmail(email) : null;

    if (!row || !row.active || !verifyPassword(password, row.pass)) {
      await Audit.log({ actor: { email }, action: 'login_failed', detail: { email }, ip });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    setSessionCookie(res, issueToken({ id: row.id, email: row.email, role: row.role }));
    await Audit.log({ actor: { id: row.id, email: row.email, role: row.role }, action: 'login', ip });
    res.json(publicOf(row));
  } catch (e) {
    next(e);
  }
});

router.post('/logout', async (req, res) => {
  if (req.auth) await Audit.log({ actor: req.auth, action: 'logout', ip: clientIp(req) });
  clearSessionCookie(res);
  res.status(204).end();
});

router.get('/me', async (req, res, next) => {
  try {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    const user = await Users.get(req.auth.sub);
    if (!user || !user.active) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session no longer valid' });
    }
    res.json(user);
  } catch (e) {
    next(e);
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const current = String(req.body?.current ?? '');
    const next_ = String(req.body?.next ?? '');
    if (next_.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    const row = await Users._raw(req.auth.sub);
    if (!row || !verifyPassword(current, row.pass)) return res.status(400).json({ error: 'Current password is incorrect.' });
    await Users.setPassword(row.id, hashPassword(next_));
    await Audit.log({ actor: req.auth, action: 'password_changed', entityType: 'user', entityId: row.id, ip: clientIp(req) });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
