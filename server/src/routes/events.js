import { Router } from 'express';
import { Audit } from '../db.js';
import { requireAuth, clientIp } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Only these client-reported actions may be written to the audit log.
const ALLOWED = new Set(['card_exported', 'batch_exported', 'card_printed']);

router.post('/', async (req, res, next) => {
  try {
    const action = String(req.body?.action ?? '');
    if (!ALLOWED.has(action)) return res.status(400).json({ error: 'Unknown event' });
    const detail = req.body?.detail && typeof req.body.detail === 'object' ? req.body.detail : undefined;
    const entityId = req.body?.entityId != null ? String(req.body.entityId).slice(0, 64) : undefined;
    await Audit.log({ actor: req.auth, action, entityType: 'card', entityId, detail, ip: clientIp(req) });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
