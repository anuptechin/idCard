import { Router } from 'express';
import { nanoid } from 'nanoid';
import { Brands, Audit } from '../db.js';
import { requireAuth, clientIp } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Any signed-in user can see and add to the shared brand library.
router.get('/', async (_req, res, next) => {
  try {
    res.json(await Brands.list());
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim().slice(0, 40);
    const logoUrl = String(req.body?.logoUrl ?? '');
    if (!name) return res.status(400).json({ error: 'Please give the brand a name.' });
    // Only accept logos produced by our own upload endpoint (no arbitrary URLs).
    if (!/^\/api\/uploads\/[A-Za-z0-9_-]+\.png$/.test(logoUrl)) return res.status(400).json({ error: 'Please upload a logo image first.' });
    const w = Math.min(120, Math.max(30, Number(req.body?.w) || 70));
    const cy = Math.min(200, Math.max(160, Number(req.body?.cy) || 181));

    const brand = await Brands.create({ id: nanoid(10), name, logoUrl, w, cy, createdBy: req.auth.email });
    await Audit.log({ actor: req.auth, action: 'brand_created', entityType: 'brand', entityId: brand.id, detail: { name }, ip: clientIp(req) });
    res.status(201).json(brand);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const brand = await Brands.get(req.params.id);
    if (!brand) return res.status(404).end();
    const isOwnerOrAdmin = brand.createdBy === req.auth.email || req.auth.role === 'admin' || req.auth.role === 'superadmin';
    if (!isOwnerOrAdmin) return res.status(403).json({ error: 'Not permitted' });
    await Brands.remove(brand.id);
    await Audit.log({ actor: req.auth, action: 'brand_deleted', entityType: 'brand', entityId: brand.id, detail: { name: brand.name }, ip: clientIp(req) });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
