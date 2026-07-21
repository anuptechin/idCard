import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { useAuth } from '../authStore';
import type { Role, User } from '../types';

const ROLE_LABEL: Record<Role, string> = { superadmin: 'Super Admin', admin: 'Admin', user: 'User' };

export function PeoplePanel({ onClose }: { onClose: () => void }) {
  const me = useAuth((s) => s.user)!;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'user' as Role, password: '' });
  const [err, setErr] = useState('');

  const refresh = () => {
    setLoading(true);
    api.listUsers().then(setUsers).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const create = async () => {
    setErr('');
    try {
      await api.createUser(form);
      toast(`User “${form.email}” created`);
      setForm({ name: '', email: '', role: 'user', password: '' });
      setCreating(false);
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const changeRole = async (u: User, role: Role) => {
    try {
      await api.setUserRole(u.id, role);
      toast(`${u.email} is now ${ROLE_LABEL[role]}`);
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const toggleActive = async (u: User) => {
    try {
      await api.setUserActive(u.id, !u.active);
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const resetPw = async (u: User) => {
    const pw = prompt(`Set a new password for “${u.email}” (min 8 chars):`);
    if (!pw) return;
    try {
      await api.resetUserPassword(u.id, pw);
      toast('Password reset');
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const remove = async (u: User) => {
    if (!confirm(`Delete user “${u.email}”? Their cards remain but become unassigned.`)) return;
    try {
      await api.deleteUser(u.id);
      toast('User deleted');
      refresh();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>User management</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm dark" onClick={() => setCreating((v) => !v)}>{creating ? 'Close form' : '＋ New user'}</button>
            <button className="x" onClick={onClose}>✕</button>
          </div>
        </div>

        {creating && (
          <div className="create-row">
            <input className="control" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="control" type="email" placeholder="email@ddecor.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className="control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <input className="control" type="text" placeholder="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button className="btn dark" onClick={create}>Create</button>
          </div>
        )}
        {err && <div className="form-err" style={{ margin: '0 20px' }}>{err}</div>}

        <div className="modal-body scroll">
          {loading ? (
            <div className="empty">Loading…</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u.id === me.id;
                  const locked = u.role === 'superadmin';
                  return (
                    <tr key={u.id} className={u.active ? '' : 'inactive'}>
                      <td>
                        <div className="u-name">{u.name} {self && <span className="you">you</span>}</div>
                        <div className="u-sub">{u.email}</div>
                      </td>
                      <td>
                        {locked ? (
                          <span className="role-badge r-superadmin">Super Admin</span>
                        ) : (
                          <select className="control mini" value={u.role} disabled={self} onChange={(e) => changeRole(u, e.target.value as Role)}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td>{u.active ? <span className="status-ok">Active</span> : <span className="status-off">Disabled</span>}</td>
                      <td className="actions-cell">
                        {!locked && !self && (
                          <>
                            <button className="btn xs" onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>
                            <button className="btn xs" onClick={() => resetPw(u)}>Reset pw</button>
                            <button className="btn xs danger" onClick={() => remove(u)}>Delete</button>
                          </>
                        )}
                        {(locked || self) && <span className="u-sub">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-foot">
          <span className="u-sub">Only the superadmin can create users and promote a user to admin.</span>
        </div>
      </div>
    </div>
  );
}
