import { useStore } from '../store';
import type { CardData } from '../types';

export function DetailsForm({ data }: { data: CardData }) {
  const patchData = useStore((s) => s.patchData);
  return (
    <div className="sec">
      <div className="sec-h">
        <span className="n">3</span>
        <h3>Details</h3>
      </div>
      <div className="field">
        <label className="lab">Full name</label>
        <input
          className="control"
          value={data.name}
          placeholder="e.g. Pravin Dhandrut"
          onChange={(e) => patchData({ name: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="lab">Designation &amp; org unit</label>
        <input
          className="control"
          value={data.designation}
          placeholder="e.g. Assistant General Manager - Design (Upholstery & Velvet)"
          onChange={(e) => patchData({ designation: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="lab">
          Employee code <span className="muted">(“Employee Code:” label is fixed)</span>
        </label>
        <input
          className="control"
          value={data.employeeCode}
          placeholder="e.g. 1667"
          onChange={(e) => patchData({ employeeCode: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="chk" style={{ marginBottom: data.showEmergency ? 8 : 0 }}>
          <input
            type="checkbox"
            checked={!!data.showEmergency}
            onChange={(e) => patchData({ showEmergency: e.target.checked })}
          />
          Include emergency contact on the card
        </label>
        {data.showEmergency && (
          <input
            className="control"
            value={data.emergencyContact ?? ''}
            placeholder="e.g. +91 90000 00000"
            onChange={(e) => patchData({ emergencyContact: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}
