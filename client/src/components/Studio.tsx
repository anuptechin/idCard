import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { TopBar } from './TopBar';
import { WorkspaceRail } from './WorkspaceRail';
import { Stage } from './Stage';
import { Inspector } from './Inspector';
import { ToastHost } from './ToastHost';
import { PeoplePanel } from './PeoplePanel';
import { AuditPanel } from './AuditPanel';

export type Panel = null | 'users' | 'audit';

export function Studio() {
  const ready = useStore((s) => s.ready);
  const init = useStore((s) => s.init);
  const reset = useStore((s) => s.reset);
  const active = useStore((s) => s.workspaces.find((w) => w.id === s.activeId) ?? null);
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    init();
    return () => reset();
  }, [init, reset]);

  if (!ready || !active) {
    return (
      <div className="loader">
        <div className="ring" />
        <div className="t">Preparing your studio…</div>
      </div>
    );
  }

  return (
    <>
      <div className="app">
        <TopBar onOpen={setPanel} />
        <WorkspaceRail />
        <Stage data={active.data} />
        <Inspector data={active.data} />
      </div>
      {panel === 'users' && <PeoplePanel onClose={() => setPanel(null)} />}
      {panel === 'audit' && <AuditPanel onClose={() => setPanel(null)} />}
      <ToastHost />
      <div id="printArea">
        <img id="printImg" alt="" />
      </div>
    </>
  );
}
