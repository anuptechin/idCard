import { useState } from 'react';
import { Logo } from './Logo';
import { useStore } from '../store';
import { useAuth } from '../authStore';
import type { Panel } from './Studio';
import { ChangePasswordModal } from './ChangePasswordModal';

const ROLE_LABEL: Record<string, string> = { superadmin: 'Super Admin', admin: 'Admin', user: 'User' };

export function TopBar({ onOpen }: { onOpen: (p: Panel) => void }) {
  const saving = useStore((s) => s.saving);
  const count = useStore((s) => s.workspaces.length);
  const addWorkspace = useStore((s) => s.addWorkspace);
  const user = useAuth((s) => s.user)!;
  const logout = useAuth((s) => s.logout);
  const [menu, setMenu] = useState(false);
  const [pw, setPw] = useState(false);

  const isSuper = user.role === 'superadmin';
  const isAdminish = user.role === 'admin' || user.role === 'superadmin';
  const close = () => setMenu(false);

  return (
    <div className="topbar">
      <Logo />
      <span className="divider" />
      <span className="badge">CR80 · 54 × 85.6 mm</span>
      <span className="spacer" />
      <span className="save-state">
        <span className={'dot' + (saving ? ' saving' : '')} />
        {saving ? 'Saving…' : 'All changes saved'}
      </span>
      <span className="badge">{count} card{count === 1 ? '' : 's'}</span>
      <button className="btn sm" onClick={() => addWorkspace({ duplicateActive: true })} title="Duplicate current card">
        Duplicate
      </button>

      <div className="usermenu" onMouseEnter={() => setMenu(true)} onMouseLeave={() => setMenu(false)}>
        <button className="user-chip" onClick={() => setMenu((v) => !v)} aria-haspopup="true" aria-expanded={menu}>
          <span className="avatar">{(user.name || user.email).slice(0, 1).toUpperCase()}</span>
          <span className="ident">
            <span className="nm">{user.name}</span>
            <span className={'role-badge r-' + user.role}>{ROLE_LABEL[user.role]}</span>
          </span>
          <span className="chev">▾</span>
        </button>
        {menu && (
          <div className="menu-pop">
            <div className="menu-head">
              <div className="mh-name">{user.name}</div>
              <div className="mh-sub">{user.email}</div>
            </div>

            {(isAdminish || isSuper) && (
              <div className="menu-group">
                {isAdminish && (
                  <button className="menu-item" onClick={() => { onOpen('audit'); close(); }}>
                    <span className="mi-ic">🗐</span> Audit log
                  </button>
                )}
                {isSuper && (
                  <button className="menu-item" onClick={() => { onOpen('users'); close(); }}>
                    <span className="mi-ic">☺</span> Users
                  </button>
                )}
              </div>
            )}

            <div className="menu-sep" />
            <button className="menu-item" onClick={() => { setPw(true); close(); }}>
              <span className="mi-ic">✳</span> Change password
            </button>
            <button className="menu-item danger" onClick={() => logout()}>
              <span className="mi-ic">⏻</span> Sign out
            </button>
          </div>
        )}
      </div>

      {pw && <ChangePasswordModal onClose={() => setPw(false)} />}
    </div>
  );
}
