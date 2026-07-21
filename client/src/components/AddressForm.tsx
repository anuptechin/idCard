import { useMemo, useState } from 'react';
import { useStore, loadAddressPresets, saveAddressPreset, deleteAddressPreset } from '../store';
import { toast } from '../lib/toast';
import type { AddressPreset, CardData } from '../types';

function matchPreset(presets: AddressPreset[], data: CardData): string {
  const key = (l: string[], t: string, f: string, w: string) => l.join('|') + '#' + t + '#' + f + '#' + w;
  const cur = key(data.addressLines, data.tel, data.fax, data.web);
  const found = presets.find((p) => key(p.lines, p.tel, p.fax, p.web) === cur);
  return found ? found.id : '__custom';
}

export function AddressForm({ data }: { data: CardData }) {
  const patchData = useStore((s) => s.patchData);
  const [presets, setPresets] = useState<AddressPreset[]>(() => loadAddressPresets());
  const selected = useMemo(() => matchPreset(presets, data), [presets, data]);

  const applyPreset = (p: AddressPreset) =>
    patchData({ addressLines: p.lines.slice(), tel: p.tel, fax: p.fax, web: p.web });

  const onSelect = (id: string) => {
    if (id === '__custom') return;
    const p = presets.find((x) => x.id === id);
    if (p) applyPreset(p);
  };

  const onSave = () => {
    const name = prompt('Name this location (e.g. “Delhi Showroom”):');
    if (!name) return;
    const next = saveAddressPreset({
      id: 'u' + Date.now(),
      name: name.trim(),
      lines: data.addressLines.slice(),
      tel: data.tel,
      fax: data.fax,
      web: data.web,
    });
    setPresets(next);
    toast('Location saved');
  };

  const onDelete = () => {
    if (selected === '__custom') return;
    const p = presets.find((x) => x.id === selected);
    if (!p || p.locked) return;
    setPresets(deleteAddressPreset(selected));
    toast('Location deleted');
  };

  const selectedPreset = presets.find((x) => x.id === selected);
  const canDelete = selectedPreset && !selectedPreset.locked;

  return (
    <div className="sec">
      <div className="sec-h">
        <span className="n">4</span>
        <h3>Address</h3>
      </div>

      <div className="field">
        <label className="lab">Saved location</label>
        <select className="control" value={selected} onChange={(e) => onSelect(e.target.value)}>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="__custom">✎ Custom (edit below)</option>
        </select>
      </div>

      <div className="field">
        <label className="lab">Address (one line per row)</label>
        <textarea
          className="control"
          rows={3}
          value={data.addressLines.join('\n')}
          placeholder={'Address line 1\nAddress line 2\nCity, State PIN'}
          onChange={(e) =>
            patchData({ addressLines: e.target.value.split('\n').map((s) => s.replace(/\s+$/, '')).slice(0, 4) })
          }
        />
      </div>

      <div className="grid-2">
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="lab">Tel</label>
          <input className="control" value={data.tel} onChange={(e) => patchData({ tel: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="lab">Fax</label>
          <input className="control" value={data.fax} onChange={(e) => patchData({ fax: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label className="lab">Website</label>
        <input className="control" value={data.web} onChange={(e) => patchData({ web: e.target.value })} />
      </div>

      <div className="grid-2">
        <button className="btn sm ghost" onClick={onSave}>
          ＋ Save location
        </button>
        <button className="btn sm" onClick={onDelete} disabled={!canDelete}>
          Delete location
        </button>
      </div>
    </div>
  );
}
