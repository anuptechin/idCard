import { useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { CardData, PhotoRef } from '../types';

function readAsDataUrl(file: File): Promise<PhotoRef> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ url: r.result as string, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = r.result as string;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function PhotoUploader({ data }: { data: CardData }) {
  const patchData = useStore((s) => s.patchData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file');
      return;
    }
    setBusy(true);
    try {
      let photo: PhotoRef;
      try {
        const up = await api.uploadPhoto(file);
        photo = { url: up.url, width: up.width, height: up.height };
      } catch {
        photo = await readAsDataUrl(file); // graceful fallback
      }
      patchData({ photo, zoom: 1, offsetX: 0, offsetY: 0 });
    } catch {
      toast('Could not read that image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sec">
      <div className="sec-h">
        <span className="n">2</span>
        <h3>Photograph</h3>
      </div>
      <div
        className={'drop' + (over ? ' over' : '') + (busy ? ' busy' : '')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />
        <div className="ic">⬆</div>
        <div className="t">{busy ? 'Processing…' : data.photo ? 'Replace photo' : 'Click to upload or drop a photo'}</div>
        <div className="s">Portrait · JPG / PNG · plain background</div>
      </div>

      {data.photo && (
        <div className="photo-tools">
          <div className="slider">
            <span className="lab">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={data.zoom}
              onChange={(e) => patchData({ zoom: parseFloat(e.target.value) })}
            />
          </div>
          <div className="grid-2">
            <button className="btn sm" onClick={() => patchData({ zoom: 1, offsetX: 0, offsetY: 0 })}>
              Reset position
            </button>
            <button className="btn sm" onClick={() => patchData({ photo: null, zoom: 1, offsetX: 0, offsetY: 0 })}>
              Remove
            </button>
          </div>
          <div className="hint">Drag the photo inside the frame to reposition.</div>
        </div>
      )}
    </div>
  );
}
