import { useState } from 'react';
import { useStore } from '../store';
import { useAuth } from '../authStore';
import { BRANDS } from '../lib/constants';

export function WorkspaceRail() {
  const workspaces = useStore((s) => s.workspaces);
  const activeId = useStore((s) => s.activeId);
  const setActive = useStore((s) => s.setActive);
  const addWorkspace = useStore((s) => s.addWorkspace);
  const deleteWorkspace = useStore((s) => s.deleteWorkspace);
  const renameWorkspace = useStore((s) => s.renameWorkspace);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const user = useAuth((s) => s.user)!;
  const seesOthers = user.role === 'admin' || user.role === 'superadmin';

  const commit = (id: string) => {
    if (draft.trim()) renameWorkspace(id, draft.trim());
    setEditing(null);
  };

  return (
    <div className="rail">
      <div className="rail-head">
        <h2>Workspaces</h2>
        <button className="btn sm" onClick={() => addWorkspace()} title="New card">
          ＋ New
        </button>
      </div>
      <div className="rail-list">
        {workspaces.map((w) => {
          const brand = BRANDS.find((b) => b.key === w.data.brand);
          const base = w.data.employeeCode ? `#${w.data.employeeCode} · ${brand?.name}` : brand?.name || '—';
          const sub = seesOthers && w.ownerUsername && w.ownerUsername !== user.email ? `${base} · by ${w.ownerUsername}` : base;
          return (
            <div
              key={w.id}
              className={'ws' + (w.id === activeId ? ' active' : '')}
              onClick={() => setActive(w.id)}
            >
              <div className="thumb">
                {w.data.photo?.url ? (
                  <img src={w.data.photo.url} alt="" />
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#c4bdaf', fontSize: 11 }}>
                    ID
                  </div>
                )}
              </div>
              <div className="meta">
                {editing === w.id ? (
                  <input
                    className="control"
                    style={{ padding: '4px 7px', fontSize: 12 }}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commit(w.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commit(w.id);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div
                      className="nm"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditing(w.id);
                        setDraft(w.name);
                      }}
                      title="Double-click to rename"
                    >
                      {w.data.name || w.name}
                    </div>
                    <div className="sub">{sub}</div>
                  </>
                )}
              </div>
              <button
                className="del"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete “${w.name}”?`)) deleteWorkspace(w.id);
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
