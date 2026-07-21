import type { AuditEntry, Brand, CardData, Role, User, Workspace } from '../types';

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const isJsonBody = typeof init?.body === 'string';
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: isJsonBody ? { 'Content-Type': 'application/json', ...(init?.headers || {}) } : init?.headers,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const body = (obj: unknown) => JSON.stringify(obj);

export const api = {
  health: () => fetch('/api/health').then((r) => r.ok),

  // ---- auth ----
  me: () => req<User>('/api/auth/me'),
  login: (email: string, password: string) =>
    req<User>('/api/auth/login', { method: 'POST', body: body({ email, password }) }),
  logout: () => req<void>('/api/auth/logout', { method: 'POST' }),
  changePassword: (current: string, next: string) =>
    req<{ ok: true }>('/api/auth/change-password', { method: 'POST', body: body({ current, next }) }),

  // ---- client events (audited) ----
  logEvent: (action: string, entityId?: string, detail?: Record<string, unknown>) =>
    req<void>('/api/events', { method: 'POST', body: body({ action, entityId, detail }) }).catch(() => {}),

  // ---- workspaces ----
  listWorkspaces: () => req<Workspace[]>('/api/workspaces'),
  createWorkspace: (name: string, data: CardData) =>
    req<Workspace>('/api/workspaces', { method: 'POST', body: body({ name, data }) }),
  updateWorkspace: (id: string, patch: Partial<{ name: string; data: CardData; position: number }>) =>
    req<Workspace>(`/api/workspaces/${id}`, { method: 'PUT', body: body(patch) }),
  deleteWorkspace: (id: string) => req<void>(`/api/workspaces/${id}`, { method: 'DELETE' }),

  // ---- photo ----
  uploadPhoto: (file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return req<{ id: string; url: string; width: number; height: number }>('/api/upload', { method: 'POST', body: fd });
  },
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return req<{ id: string; url: string; width: number; height: number }>('/api/upload/logo', { method: 'POST', body: fd });
  },

  // ---- custom brand library ----
  listBrands: () => req<Brand[]>('/api/brands'),
  createBrand: (name: string, logoUrl: string) =>
    req<Brand>('/api/brands', { method: 'POST', body: body({ name, logoUrl }) }),
  deleteBrand: (id: string) => req<void>(`/api/brands/${id}`, { method: 'DELETE' }),

  // ---- users (superadmin) ----
  listUsers: () => req<User[]>('/api/users'),
  createUser: (u: { email: string; name: string; role: Role; password: string }) =>
    req<User>('/api/users', { method: 'POST', body: body(u) }),
  setUserRole: (id: string, role: Role) => req<User>(`/api/users/${id}/role`, { method: 'PATCH', body: body({ role }) }),
  setUserActive: (id: string, active: boolean) =>
    req<User>(`/api/users/${id}/active`, { method: 'PATCH', body: body({ active }) }),
  resetUserPassword: (id: string, password: string) =>
    req<{ ok: true }>(`/api/users/${id}/reset-password`, { method: 'POST', body: body({ password }) }),
  deleteUser: (id: string) => req<void>(`/api/users/${id}`, { method: 'DELETE' }),

  // ---- audit (admin + superadmin) ----
  audit: (limit = 500) => req<{ total: number; actions: string[]; entries: AuditEntry[] }>(`/api/audit?limit=${limit}`),
};
