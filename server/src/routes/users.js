import { Router } from 'express';
import { nanoid } from 'nanoid';
import { Users, Audit } from '../db.js';
import { hashPassword, requireRole, clientIp } from '../auth.js';

const router = Router();
router.use(requireRole('superadmin')); // user management is superadmin-only

const ASSIGNABLE = ['user', 'admin']; // 'superadmin' is never assignable
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', async (_req, res, next) => {
  try {
    res.json(await Users.listManageable());
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const name = String(req.body?.name ?? '').trim().slice(0, 80) || email.split('@')[0];
    const role = req.body?.role;
    const password = String(req.body?.password ?? '');

    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (!ASSIGNABLE.includes(role)) return res.status(400).json({ error: 'Role must be "user" or "admin".' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (await Users.rawByEmail(email)) return res.status(409).json({ error: 'That email is already registered.' });

    const user = await Users.create({ id: nanoid(12), email, name, role, pass: hashPassword(password), createdBy: req.auth.email });
    await Audit.log({ actor: req.auth, action: 'user_created', entityType: 'user', entityId: user.id, detail: { email, role }, ip: clientIp(req) });
    res.status(201).json(user);
  } catch (e) {
    next(e);
  }
});

async function guardTarget(req, res) {
  const target = await Users.get(req.params.id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (target.id === req.auth.sub) {
    res.status(400).json({ error: 'You cannot modify your own account here.' });
    return null;
  }
  if (target.role === 'superadmin') {
    res.status(403).json({ error: 'This account cannot be modified.' });
    return null;
  }
  return target;
}

router.patch('/:id/role', async (req, res, next) => {
  try {
    const target = await guardTarget(req, res);
    if (!target) return;
    const role = req.body?.role;
    if (!ASSIGNABLE.includes(role)) return res.status(400).json({ error: 'Role must be "user" or "admin".' });
    const updated = await Users.setRole(target.id, role);
    await Audit.log({ actor: req.auth, action: role === 'admin' ? 'user_promoted' : 'user_demoted', entityType: 'user', entityId: target.id, detail: { email: target.email, role }, ip: clientIp(req) });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/active', async (req, res, next) => {
  try {
    const target = await guardTarget(req, res);
    if (!target) return;
    const active = !!req.body?.active;
    const updated = await Users.setActive(target.id, active);
    await Audit.log({ actor: req.auth, action: active ? 'user_activated' : 'user_deactivated', entityType: 'user', entityId: target.id, detail: { email: target.email }, ip: clientIp(req) });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const target = await guardTarget(req, res);
    if (!target) return;
    const password = String(req.body?.password ?? '');
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    await Users.setPassword(target.id, hashPassword(password));
    await Audit.log({ actor: req.auth, action: 'user_password_reset', entityType: 'user', entityId: target.id, detail: { email: target.email }, ip: clientIp(req) });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const target = await guardTarget(req, res);
    if (!target) return;
    await Users.remove(target.id);
    await Audit.log({ actor: req.auth, action: 'user_deleted', entityType: 'user', entityId: target.id, detail: { email: target.email }, ip: clientIp(req) });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
