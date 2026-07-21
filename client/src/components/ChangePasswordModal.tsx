import { useState } from 'react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setErr('');
    if (next.length < 8) return setErr('New password must be at least 8 characters.');
    if (next !== confirm) return setErr('New passwords do not match.');
    setBusy(true);
    try {
      await api.changePassword(cur, next);
      toast('Password changed');
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal sm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Change password</h3>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field"><label className="lab">Current password</label>
            <input className="control" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoFocus /></div>
          <div className="field"><label className="lab">New password</label>
            <input className="control" type="password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
          <div className="field"><label className="lab">Confirm new password</label>
            <input className="control" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          {err && <div className="form-err">{err}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn dark" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </div>
      </div>
    </div>
  );
}
