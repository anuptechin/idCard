import { useState } from 'react';
import { DPI_OPTIONS } from '../lib/constants';
import { exportPdf, exportPng, exportPrint, exportAllPdf } from '../lib/exportCard';
import { toast } from '../lib/toast';
import { api } from '../lib/api';
import { useStore } from '../store';
import type { CardData } from '../types';

interface Props {
  data: CardData;
  dpi: number;
  setDpi: (d: number) => void;
  marks: boolean;
  setMarks: (m: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export function ExportBar({ data, dpi, setDpi, marks, setMarks, collapsed, setCollapsed }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const workspaces = useStore((s) => s.workspaces);
  const activeId = useStore((s) => s.activeId) || undefined;

  const run = async (kind: 'png' | 'pdf' | 'print') => {
    setBusy(kind);
    try {
      if (kind === 'png') {
        await exportPng(data, { dpi, marks });
        api.logEvent('card_exported', activeId, { format: 'PNG', dpi, name: data.name, card: data.name });
        toast(`PNG exported · ${dpi} DPI`);
      } else if (kind === 'pdf') {
        await exportPdf(data, { dpi, marks });
        api.logEvent('card_exported', activeId, { format: 'PDF', dpi, name: data.name, card: data.name });
        toast('PDF exported · true CR80 size');
      } else {
        const url = await exportPrint(data, { dpi, marks });
        (document.getElementById('printImg') as HTMLImageElement).src = url;
        api.logEvent('card_printed', activeId, { name: data.name, card: data.name });
        setTimeout(() => window.print(), 150);
      }
    } catch (e) {
      toast('Export failed — please retry');
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const runAll = async () => {
    setBusy('all');
    setProgress({ done: 0, total: workspaces.length });
    try {
      const items = workspaces.map((w) => ({ name: w.data.name || w.name, data: w.data }));
      await exportAllPdf(items, { dpi, marks }, (done, total) => setProgress({ done, total }));
      api.logEvent('batch_exported', undefined, { count: workspaces.length, dpi });
      toast(`Exported ${workspaces.length} cards to one PDF`);
    } catch (e) {
      toast('Batch export failed — please retry');
      console.error(e);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  return (
    <div className={'exportbar' + (collapsed ? ' collapsed' : '')}>
      <div className="eb-handle" onClick={() => setCollapsed(!collapsed)}>
        <span className="eb-title">Export &amp; print</span>
        <span className="eb-hint">{collapsed ? `${dpi} DPI · ${workspaces.length} card${workspaces.length === 1 ? '' : 's'}` : ''}</span>
        <span className="eb-chev">{collapsed ? '▴' : '▾'}</span>
      </div>

      {!collapsed && (
        <div className="eb-body">
          <div className="row">
            <span className="lbl">Resolution</span>
            <div className="seg">
              {DPI_OPTIONS.map((d) => (
                <button key={d} className={d === dpi ? 'on' : ''} onClick={() => setDpi(d)}>
                  {d}
                </button>
              ))}
            </div>
            <label className="chk" style={{ marginLeft: 'auto' }}>
              <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} />
              Crop marks + bleed
            </label>
          </div>
          <div className="actions">
            <button className="btn dark" disabled={!!busy} onClick={() => run('png')}>
              {busy === 'png' ? 'Exporting…' : 'Download PNG'}
            </button>
            <button className="btn dark" disabled={!!busy} onClick={() => run('pdf')}>
              {busy === 'pdf' ? 'Exporting…' : 'Download PDF'}
            </button>
            <button className="btn" disabled={!!busy} onClick={() => run('print')}>
              Print
            </button>
          </div>
          <button className="btn all" disabled={!!busy} onClick={runAll} title="Combine every workspace into one printable PDF">
            {busy === 'all' && progress
              ? `Building PDF…  ${progress.done} / ${progress.total}`
              : `⤓  Export ALL ${workspaces.length} card${workspaces.length === 1 ? '' : 's'} → one PDF`}
          </button>
        </div>
      )}
    </div>
  );
}
