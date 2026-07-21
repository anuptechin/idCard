import { useEffect, useState } from 'react';
import { BRANDS } from '../lib/constants';
import { LOGOS } from '../assets/logos';
import { useStore } from '../store';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { AddBrandModal } from './AddBrandModal';
import type { Brand, CardData } from '../types';

export function BrandPicker({ data }: { data: CardData }) {
  const patchData = useStore((s) => s.patchData);
  const [custom, setCustom] = useState<Brand[]>([]);
  const [adding, setAdding] = useState(false);

  const refresh = () => api.listBrands().then(setCustom).catch(() => {});
  useEffect(() => {
    refresh();
  }, []);

  const pickBuiltin = (key: string) => patchData({ brand: key, logoUrl: null, brandLabel: null });
  const pickCustom = (b: Brand) => patchData({ brand: b.id, logoUrl: b.logoUrl, brandLabel: b.name });

  const removeBrand = async (b: Brand) => {
    if (!confirm(`Remove brand “${b.name}” from the library?`)) return;
    try {
      await api.deleteBrand(b.id);
      setCustom((c) => c.filter((x) => x.id !== b.id));
      if (data.brand === b.id) pickBuiltin('fabrics');
      toast('Brand removed');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div className="sec">
      <div className="sec-h">
        <span className="n">1</span>
        <h3>Brand / Logo</h3>
      </div>
      <div className="brand-grid">
        {BRANDS.map((b) => (
          <div key={b.key} className={'brand-chip' + (data.brand === b.key ? ' sel' : '')} onClick={() => pickBuiltin(b.key)}>
            <span className="tick">✓</span>
            <img src={LOGOS[b.key]} alt={b.name} />
            <span className="cap">{b.name}</span>
          </div>
        ))}

        {custom.map((b) => (
          <div key={b.id} className={'brand-chip' + (data.brand === b.id ? ' sel' : '')} onClick={() => pickCustom(b)}>
            <span className="tick">✓</span>
            <button className="chip-del" title="Remove brand" onClick={(e) => { e.stopPropagation(); removeBrand(b); }}>×</button>
            <img src={b.logoUrl} alt={b.name} />
            <span className="cap">{b.name}</span>
          </div>
        ))}

        <button className="brand-chip add" onClick={() => setAdding(true)} title="Upload a new brand logo">
          <span className="add-plus">＋</span>
          <span className="cap">Add logo</span>
        </button>
      </div>

      {adding && (
        <AddBrandModal
          onClose={() => setAdding(false)}
          onCreated={(b) => {
            setCustom((c) => [b, ...c]);
            pickCustom(b);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}
