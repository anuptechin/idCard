import { create } from 'zustand';
import type { CardData, Workspace } from './types';
import { newCardData, DEFAULT_ADDRESSES } from './lib/constants';
import { api } from './lib/api';

interface Store {
  ready: boolean;
  saving: boolean;
  error: string | null;
  workspaces: Workspace[];
  activeId: string | null;

  init: () => Promise<void>;
  reset: () => void;
  active: () => Workspace | null;
  setActive: (id: string) => void;
  addWorkspace: (opts?: { duplicateActive?: boolean }) => Promise<void>;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => Promise<void>;
  patchData: (patch: Partial<CardData>) => void;
}

let saveTimer: number | undefined;

export const useStore = create<Store>((set, get) => ({
  ready: false,
  saving: false,
  error: null,
  workspaces: [],
  activeId: null,

  async init() {
    set({ ready: false, error: null });
    try {
      let workspaces = await api.listWorkspaces();
      if (workspaces.length === 0) {
        const ws = await api.createWorkspace('Card 1', newCardData());
        workspaces = [ws];
      }
      set({ workspaces, activeId: workspaces[0]?.id ?? null, ready: true });
    } catch (e) {
      set({ error: (e as Error).message, ready: true, workspaces: [], activeId: null });
    }
  },

  reset() {
    window.clearTimeout(saveTimer);
    set({ ready: false, workspaces: [], activeId: null, error: null, saving: false });
  },

  active() {
    const { workspaces, activeId } = get();
    return workspaces.find((w) => w.id === activeId) ?? null;
  },

  setActive(id) {
    set({ activeId: id });
  },

  async addWorkspace(opts) {
    const src = opts?.duplicateActive ? get().active() : null;
    const data: CardData = src ? JSON.parse(JSON.stringify(src.data)) : newCardData();
    const baseName = src ? `${src.name} (copy)` : `Card ${get().workspaces.length + 1}`;
    try {
      const ws = await api.createWorkspace(baseName, data);
      set({ workspaces: [...get().workspaces, ws], activeId: ws.id });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  renameWorkspace(id, name) {
    set({ workspaces: get().workspaces.map((w) => (w.id === id ? { ...w, name } : w)) });
    api.updateWorkspace(id, { name }).catch(() => {});
  },

  async deleteWorkspace(id) {
    const remaining = get().workspaces.filter((w) => w.id !== id);
    try {
      await api.deleteWorkspace(id);
    } catch (e) {
      set({ error: (e as Error).message });
      return;
    }
    const activeId = get().activeId === id ? remaining[0]?.id ?? null : get().activeId;
    set({ workspaces: remaining, activeId });
    if (remaining.length === 0) await get().addWorkspace();
  },

  patchData(patch) {
    const { activeId, workspaces } = get();
    if (!activeId) return;
    const next = workspaces.map((w) =>
      w.id === activeId ? { ...w, data: { ...w.data, ...patch }, updatedAt: Date.now() } : w
    );
    set({ workspaces: next, saving: true });
    const ws = next.find((w) => w.id === activeId)!;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      api
        .updateWorkspace(activeId, { data: ws.data })
        .catch((e) => set({ error: (e as Error).message }))
        .finally(() => set({ saving: false }));
    }, 450);
  },
}));

/* ---------- address presets (local, per-browser) ---------- */
const LS_ADDR = 'ddecor_id_studio_addresses_v1';
export function loadAddressPresets() {
  try {
    const custom = JSON.parse(localStorage.getItem(LS_ADDR) || '[]');
    return [...DEFAULT_ADDRESSES, ...custom];
  } catch {
    return [...DEFAULT_ADDRESSES];
  }
}
export function saveAddressPreset(preset: { id: string; name: string; lines: string[]; tel: string; fax: string; web: string }) {
  const custom = JSON.parse(localStorage.getItem(LS_ADDR) || '[]');
  custom.push(preset);
  localStorage.setItem(LS_ADDR, JSON.stringify(custom));
  return loadAddressPresets();
}
export function deleteAddressPreset(id: string) {
  const custom = JSON.parse(localStorage.getItem(LS_ADDR) || '[]').filter((p: any) => p.id !== id);
  localStorage.setItem(LS_ADDR, JSON.stringify(custom));
  return loadAddressPresets();
}
