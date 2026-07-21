import { useState } from 'react';
import { CARD, MM_PER_PT } from '../lib/constants';
import { CardCanvas } from './CardCanvas';
import { ExportBar } from './ExportBar';
import type { CardData } from '../types';

export function Stage({ data }: { data: CardData }) {
  const [dpi, setDpi] = useState(600);
  const [marks, setMarks] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // reserve vertical room for the floating bar so the card (and address) stays fully visible
  const bottomInset = collapsed ? 70 : 210;

  return (
    <div className="stage">
      <div className="stage-inner" style={{ paddingBottom: bottomInset + 24 }}>
        <div className="stage-eyebrow">Live preview · true CR80 proportions</div>
        <div className="card-shell">
          <CardCanvas data={data} marks={marks} bottomInset={bottomInset} />
        </div>
        <div className="stage-foot">
          {(CARD.w * MM_PER_PT).toFixed(1)} × {(CARD.h * MM_PER_PT).toFixed(1)} mm · <b>{dpi} DPI export</b>
        </div>
      </div>
      <ExportBar
        data={data}
        dpi={dpi}
        setDpi={setDpi}
        marks={marks}
        setMarks={setMarks}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
    </div>
  );
}
