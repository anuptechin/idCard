import { nanoid } from 'nanoid';
import { Users } from './db.js';
import { hashPassword } from './auth.js';
import { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } from './config.js';

/**
 * Platform-owner superadmin.
 * Seeded ONCE from env (SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD). After the first
 * successful boot it lives in Postgres and survives rebuilds — you can then remove
 * the env vars. It is hidden from user management and the audit log.
 */
export async function ensureSuperadmin() {
  if (await Users.hasSuperadmin()) {
    console.log('  Superadmin: present (persisted).');
    return;
  }
  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.warn(
      '\n  ⚠  No superadmin exists and SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD are not set.\n' +
        '     Set them in your environment (.env) and restart to seed the platform owner.\n'
    );
    return;
  }
  // Guard: don't collide with an existing (non-superadmin) account on that email.
  const clash = await Users.rawByEmail(SUPERADMIN_EMAIL);
  if (clash) {
    console.warn(`  ⚠  Cannot seed superadmin: email ${SUPERADMIN_EMAIL} already in use.`);
    return;
  }
  await Users.create({
    id: nanoid(12),
    email: SUPERADMIN_EMAIL,
    name: 'Platform Owner',
    role: 'superadmin',
    pass: hashPassword(SUPERADMIN_PASSWORD),
    createdBy: 'env',
  });
  console.log(`\n  ✔ Superadmin seeded from env: ${SUPERADMIN_EMAIL}\n    You may now remove SUPERADMIN_* from your environment.\n`);
}
