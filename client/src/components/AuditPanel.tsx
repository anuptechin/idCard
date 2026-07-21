import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { AuditEntry } from '../types';

const LABEL: Record<string, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  login_failed: 'Failed sign-in',
  card_created: 'Created card',
  card_deleted: 'Deleted card',
  card_exported: 'Exported card',
  batch_exported: 'Exported batch',
  card_printed: 'Printed card',
  user_created: 'Created user',
  user_promoted: 'Promoted to admin',
  user_demoted: 'Demoted to user',
  user_activated: 'Enabled user',
  user_deactivated: 'Disabled user',
  user_password_reset: 'Reset password',
  user_deleted: 'Deleted user',
  password_changed: 'Changed own password',
};
const label = (a: string) => LABEL[a] || a;

function fmt(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function describe(e: AuditEntry) {
  const d = (e.detail || {}) as any;
  if (e.action === 'card_created') return `${d.name || d.card || 'card'}${d.employeeCode ? ` · #${d.employeeCode}` : ''}`;
  if (e.action === 'card_exported') return `${d.name || d.card || ''}${d.format ? ` · ${d.format}` : ''}${d.dpi ? ` · ${d.dpi}dpi` : ''}`;
  if (e.action === 'batch_exported') return `${d.count ?? ''} cards${d.dpi ? ` · ${d.dpi}dpi` : ''}`;
  if (e.action === 'card_deleted' || e.action === 'card_printed') return `${d.card || d.name || ''}`;
  if (e.action?.startsWith('user_')) return `${d.email || ''}${d.role ? ` → ${d.role}` : ''}`;
  return '';
}

export function AuditPanel({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');

  const load = () => {
    setLoading(true);
    api.audit(1000).then((r) => { setEntries(r.entries); setActions(r.actions); setTotal(r.total); }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (action && e.action !== action) return false;
      if (!needle) return true;
      const hay = `${e.actorUsername} ${e.actorRole} ${label(e.action)} ${e.action} ${describe(e)} ${e.ip} ${fmt(e.ts)}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [entries, q, action]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Audit log <span className="u-sub">· {total} events</span></h3>
          <div className="audit-controls">
            <select className="control mini" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All event types</option>
              {actions.map((a) => (
                <option key={a} value={a}>{label(a)}</option>
              ))}
            </select>
            <input className="control mini" placeholder="Search everything…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn sm" onClick={load} title="Refresh">↻</button>
            <button className="x" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body scroll">
          {loading ? (
            <div className="empty">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="empty">No matching activity.</div>
          ) : (
            <table className="tbl audit">
              <thead>
                <tr><th>When</th><th>Who</th><th>Event</th><th>Details</th><th>IP</th></tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id} className={e.action === 'login_failed' ? 'row-warn' : ''}>
                    <td className="mono">{fmt(e.ts)}</td>
                    <td>
                      <span className="u-name">{e.actorUsername || '—'}</span>
                      {e.actorRole && <span className={'role-badge r-' + e.actorRole} style={{ marginLeft: 6 }}>{e.actorRole}</span>}
                    </td>
                    <td>{label(e.action)}</td>
                    <td className="u-sub">{describe(e)}</td>
                    <td className="mono u-sub">{e.ip || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-foot">
          <span className="u-sub">Showing {shown.length} of {entries.length} loaded · captures sign-ins, card creation & generation, and account changes. The platform owner is never logged.</span>
        </div>
      </div>
    </div>
  );
}
