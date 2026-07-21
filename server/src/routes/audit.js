import { Router } from 'express';
import { Audit } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();
router.use(requireRole('admin', 'superadmin')); // audit log: admin + superadmin

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 400));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const action = req.query.action ? String(req.query.action) : undefined;
    const q = req.query.q ? String(req.query.q) : undefined;
    const [entries, actions, total] = await Promise.all([
      Audit.list({ limit, offset, action, q }),
      Audit.distinctActions(),
      Audit.count(),
    ]);
    res.json({ total, actions, entries });
  } catch (e) {
    next(e);
  }
});

export default router;
