import express from 'express';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';

import { PORT, IS_PROD, UPLOADS_DIR, CLIENT_DIST } from './config.js';
import { initDb } from './db.js';
import { securityHeaders, corsPolicy, apiLimiter, uploadLimiter } from './security.js';
import { attachUser } from './auth.js';
import { ensureSuperadmin } from './bootstrap.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import auditRouter from './routes/audit.js';
import eventsRouter from './routes/events.js';
import workspacesRouter from './routes/workspaces.js';
import brandsRouter from './routes/brands.js';
import uploadRouter from './routes/upload.js';

async function main() {
  await initDb();
  await ensureSuperadmin();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(securityHeaders());
  app.use(corsPolicy());
  app.use(compression());
  app.use(express.json({ limit: '12mb' }));
  app.use(attachUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use(
    '/api/uploads',
    express.static(UPLOADS_DIR, {
      immutable: true,
      maxAge: '365d',
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'same-origin'),
    })
  );

  app.use('/api/auth', apiLimiter, authRouter);
  app.use('/api/users', apiLimiter, usersRouter);
  app.use('/api/audit', apiLimiter, auditRouter);
  app.use('/api/events', apiLimiter, eventsRouter);
  app.use('/api/upload', uploadLimiter, uploadRouter);
  app.use('/api/brands', apiLimiter, brandsRouter);
  app.use('/api/workspaces', apiLimiter, workspacesRouter);

  if (IS_PROD && fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST, { maxAge: '7d' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    });
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'Server error' });
  });

  app.listen(PORT, () => {
    console.log(`\n  D'DECOR ID Card Studio — API on http://localhost:${PORT}  (${IS_PROD ? 'production' : 'development'})\n`);
  });
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
