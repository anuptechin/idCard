import { useRef, useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { Brand } from '../types';

export function AddBrandModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Brand) => void }) {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<{ url: string; width: number; height: number } | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return setErr('Please choose an image file.');
    setErr('');
    setBusy(true);
    try {
      const up = await api.uploadLogo(file); // server auto-crops (trims) + returns transparent PNG
      setLogo({ url: up.url, width: up.width, height: up.height });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setErr('');
    if (!name.trim()) return setErr('Give the brand a name.');
    if (!logo) return setErr('Upload a logo image.');
    setBusy(true);
    try {
      const brand = await api.createBrand(name.trim(), logo.url);
      toast(`Brand “${brand.name}” added`);
      onCreated(brand);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal sm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add a brand logo</h3>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="lab">Brand name</label>
            <input className="control" autoFocus placeholder="e.g. Home Ideas" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <label className="lab">Logo <span className="muted">(auto-cropped to the mark)</span></label>
            <div
              className={'drop' + (over ? ' over' : '') + (busy ? ' busy' : '')}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
            >
              <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              {logo ? (
                <div className="logo-preview">
                  <img src={logo.url} alt="logo preview" />
                  <div className="s">Cropped preview — click to replace</div>
                </div>
              ) : (
                <>
                  <div className="ic">⬆</div>
                  <div className="t">{busy ? 'Processing…' : 'Click to upload or drop a logo'}</div>
                  <div className="s">PNG / JPG · whitespace is trimmed automatically</div>
                </>
              )}
            </div>
          </div>

          {err && <div className="form-err">{err}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn dark" onClick={save} disabled={busy || !logo || !name.trim()}>
            {busy ? 'Saving…' : 'Add brand'}
          </button>
        </div>
      </div>
    </div>
  );
}
