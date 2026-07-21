import pg from 'pg';
import { DATABASE_URL } from './config.js';

// Timestamps are stored as BIGINT ms; make pg return them as JS numbers.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

export async function initDb({ retries = 30, delayMs = 1000 } = {}) {
  // Wait for Postgres to accept connections (compose start ordering).
  for (let i = 0; ; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (e) {
      if (i >= retries) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL CHECK (role IN ('superadmin','admin','user')),
      pass        TEXT NOT NULL,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_by  TEXT,
      created_at  BIGINT NOT NULL,
      updated_at  BIGINT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

    CREATE TABLE IF NOT EXISTS workspaces (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      data           JSONB NOT NULL,
      owner_id       TEXT,
      owner_email    TEXT,
      position       INTEGER NOT NULL DEFAULT 0,
      created_at     BIGINT NOT NULL,
      updated_at     BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ws_owner ON workspaces (owner_id);

    CREATE TABLE IF NOT EXISTS audit (
      id             BIGSERIAL PRIMARY KEY,
      ts             BIGINT NOT NULL,
      actor_id       TEXT,
      actor_email    TEXT,
      actor_role     TEXT,
      action         TEXT NOT NULL,
      entity_type    TEXT,
      entity_id      TEXT,
      detail         JSONB,
      ip             TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit (ts DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit (action);

    CREATE TABLE IF NOT EXISTS brands (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      logo_url    TEXT NOT NULL,
      w           REAL NOT NULL DEFAULT 70,
      cy          REAL NOT NULL DEFAULT 181,
      created_by  TEXT,
      created_at  BIGINT NOT NULL
    );
  `);
}

const publicUser = (r) =>
  r && {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    active: r.active,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

/* ===================== USERS ===================== */
export const Users = {
  async count() {
    return Number((await pool.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n);
  },
  async hasSuperadmin() {
    return (await pool.query(`SELECT 1 FROM users WHERE role = 'superadmin' LIMIT 1`)).rowCount > 0;
  },
  async rawByEmail(email) {
    return (await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email])).rows[0] || null;
  },
  async _raw(id) {
    return (await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0] || null;
  },
  async get(id) {
    return publicUser((await pool.query('SELECT * FROM users WHERE id = $1', [id])).rows[0]);
  },
  /** Manageable users exclude the hidden platform-owner superadmin. */
  async listManageable() {
    const rows = (
      await pool.query(
        `SELECT * FROM users WHERE role <> 'superadmin' ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, LOWER(email)`
      )
    ).rows;
    return rows.map(publicUser);
  },
  async create({ id, email, name, role, pass, createdBy }) {
    const now = Date.now();
    await pool.query(
      `INSERT INTO users (id,email,name,role,pass,active,created_by,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7,$7)`,
      [id, email, name, role, pass, createdBy ?? null, now]
    );
    return this.get(id);
  },
  async setRole(id, role) {
    await pool.query('UPDATE users SET role=$2, updated_at=$3 WHERE id=$1', [id, role, Date.now()]);
    return this.get(id);
  },
  async setActive(id, active) {
    await pool.query('UPDATE users SET active=$2, updated_at=$3 WHERE id=$1', [id, !!active, Date.now()]);
    return this.get(id);
  },
  async setPassword(id, pass) {
    await pool.query('UPDATE users SET pass=$2, updated_at=$3 WHERE id=$1', [id, pass, Date.now()]);
  },
  async remove(id) {
    return (await pool.query('DELETE FROM users WHERE id=$1', [id])).rowCount > 0;
  },
};

/* ===================== WORKSPACES (RLS) ===================== */
const toWs = (r) =>
  r && {
    id: r.id,
    name: r.name,
    data: r.data,
    ownerId: r.owner_id,
    ownerUsername: r.owner_email, // client label
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

export const Workspaces = {
  async listFor(user) {
    const uid = user.sub ?? user.id;
    const rows =
      user.role === 'user'
        ? (await pool.query('SELECT * FROM workspaces WHERE owner_id=$1 ORDER BY position, updated_at DESC', [uid])).rows
        : (await pool.query('SELECT * FROM workspaces ORDER BY position, updated_at DESC')).rows;
    return rows.map(toWs);
  },
  async get(id) {
    return toWs((await pool.query('SELECT * FROM workspaces WHERE id=$1', [id])).rows[0]);
  },
  async create({ id, name, data, owner }) {
    const now = Date.now();
    const pos = (await pool.query('SELECT COALESCE(MAX(position),-1)+1 AS p FROM workspaces')).rows[0].p;
    await pool.query(
      `INSERT INTO workspaces (id,name,data,owner_id,owner_email,position,created_at,updated_at)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$7)`,
      [id, name, JSON.stringify(data), owner.id, owner.email, pos, now]
    );
    return this.get(id);
  },
  async update(id, { name, data, position }) {
    const ex = await this.get(id);
    if (!ex) return null;
    await pool.query(
      `UPDATE workspaces SET name=$2, data=$3::jsonb, position=$4, updated_at=$5 WHERE id=$1`,
      [id, name ?? ex.name, JSON.stringify(data ?? ex.data), position ?? ex.position, Date.now()]
    );
    return this.get(id);
  },
  async remove(id) {
    return (await pool.query('DELETE FROM workspaces WHERE id=$1', [id])).rowCount > 0;
  },
  canModify: (user, ws) => user.role === 'admin' || user.role === 'superadmin' || ws.ownerId === (user.sub ?? user.id),
};

/* ===================== AUDIT ===================== */
export const Audit = {
  /** Platform-owner (superadmin) actions are never recorded — it stays invisible. */
  async log({ actor, action, entityType, entityId, detail, ip }) {
    if (actor?.role === 'superadmin') return;
    await pool.query(
      `INSERT INTO audit (ts,actor_id,actor_email,actor_role,action,entity_type,entity_id,detail,ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [
        Date.now(),
        actor?.sub ?? actor?.id ?? null,
        actor?.email ?? null,
        actor?.role ?? null,
        action,
        entityType ?? null,
        entityId != null ? String(entityId) : null,
        detail ? JSON.stringify(detail) : null,
        ip ?? null,
      ]
    );
  },
  async distinctActions() {
    return (await pool.query('SELECT DISTINCT action FROM audit ORDER BY action')).rows.map((r) => r.action);
  },
  async list({ limit = 300, offset = 0, action, q } = {}) {
    const where = [];
    const args = [];
    if (action) {
      args.push(action);
      where.push(`action = $${args.length}`);
    }
    if (q) {
      args.push(`%${q}%`);
      const i = args.length;
      where.push(`(actor_email ILIKE $${i} OR action ILIKE $${i} OR detail::text ILIKE $${i} OR ip ILIKE $${i})`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    args.push(limit);
    args.push(offset);
    const rows = (
      await pool.query(
        `SELECT * FROM audit ${clause} ORDER BY ts DESC, id DESC LIMIT $${args.length - 1} OFFSET $${args.length}`,
        args
      )
    ).rows;
    return rows.map((r) => ({
      id: Number(r.id),
      ts: r.ts,
      actorUsername: r.actor_email,
      actorRole: r.actor_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      detail: r.detail,
      ip: r.ip,
    }));
  },
  async count() {
    return Number((await pool.query('SELECT COUNT(*)::int AS n FROM audit')).rows[0].n);
  },
};

/* ===================== BRANDS (shared custom logo library) ===================== */
const toBrand = (r) =>
  r && { id: r.id, name: r.name, logoUrl: r.logo_url, w: r.w, cy: r.cy, createdBy: r.created_by, createdAt: r.created_at };

export const Brands = {
  async list() {
    return (await pool.query('SELECT * FROM brands ORDER BY created_at DESC')).rows.map(toBrand);
  },
  async get(id) {
    return toBrand((await pool.query('SELECT * FROM brands WHERE id=$1', [id])).rows[0]);
  },
  async create({ id, name, logoUrl, w, cy, createdBy }) {
    await pool.query(
      'INSERT INTO brands (id,name,logo_url,w,cy,created_by,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, name, logoUrl, w ?? 70, cy ?? 181, createdBy ?? null, Date.now()]
    );
    return this.get(id);
  },
  async remove(id) {
    return (await pool.query('DELETE FROM brands WHERE id=$1', [id])).rowCount > 0;
  },
};

export default pool;
