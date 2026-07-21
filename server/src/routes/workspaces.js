import { Router } from 'express';
import { nanoid } from 'nanoid';
import { Workspaces, Audit } from '../db.js';
import { requireAuth, clientIp } from '../auth.js';

const router = Router();
router.use(requireAuth);

function sanitizeName(name) {
  if (typeof name !== 'string') return 'Untitled card';
  const clean = name.trim().slice(0, 80);
  return clean.length ? clean : 'Untitled card';
}
function sanitizeData(data) {
  const json = JSON.stringify(data ?? {});
  if (json.length > 8_000_000) {
    const e = new Error('Workspace payload too large.');
    e.status = 413;
    throw e;
  }
  return data ?? {};
}
const canView = (user, ws) => user.role !== 'user' || ws.ownerId === user.sub;

router.get('/', async (req, res, next) => {
  try {
    res.json(await Workspaces.listFor(req.auth));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const ws = await Workspaces.get(req.params.id);
    if (!ws) return res.status(404).json({ error: 'Not found' });
    if (!canView(req.auth, ws)) return res.status(403).json({ error: 'Not permitted' });
    res.json(ws);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const id = nanoid(12);
    const data = sanitizeData(req.body?.data);
    const ws = await Workspaces.create({
      id,
      name: sanitizeName(req.body?.name),
      data,
      owner: { id: req.auth.sub, email: req.auth.email },
    });
    await Audit.log({
      actor: req.auth,
      action: 'card_created',
      entityType: 'card',
      entityId: id,
      detail: { card: ws.name, name: data?.name, employeeCode: data?.employeeCode },
      ip: clientIp(req),
    });
    res.status(201).json(ws);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const ws = await Workspaces.get(req.params.id);
    if (!ws) return res.status(404).json({ error: 'Not found' });
    if (!Workspaces.canModify(req.auth, ws)) return res.status(403).json({ error: 'Not permitted' });
    const patch = {};
    if (req.body?.name !== undefined) patch.name = sanitizeName(req.body.name);
    if (req.body?.data !== undefined) patch.data = sanitizeData(req.body.data);
    if (req.body?.position !== undefined) patch.position = Number(req.body.position) || 0;
    res.json(await Workspaces.update(ws.id, patch));
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ws = await Workspaces.get(req.params.id);
    if (!ws) return res.status(404).end();
    if (!Workspaces.canModify(req.auth, ws)) return res.status(403).json({ error: 'Not permitted' });
    await Workspaces.remove(ws.id);
    await Audit.log({
      actor: req.auth,
      action: 'card_deleted',
      entityType: 'card',
      entityId: ws.id,
      detail: { card: ws.name, owner: ws.ownerUsername },
      ip: clientIp(req),
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
