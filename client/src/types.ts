export type BrandKey = 'fabrics' | 'homestore' | 'homeideas' | 'wordmark';

export type Role = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuditEntry {
  id: number;
  ts: number;
  actorUsername: string | null;
  actorRole: Role | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
}

export interface PhotoRef {
  /** Same-origin URL (server upload) or data URL (sample). */
  url: string;
  width: number;
  height: number;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl: string;
  w: number;
  cy: number;
  createdBy?: string;
  createdAt: number;
}

export interface CardData {
  /** A built-in BrandKey, or a custom brand id. */
  brand: string;
  /** Set when `brand` is a custom brand — the logo to render + its label. */
  logoUrl?: string | null;
  brandLabel?: string | null;
  name: string;
  designation: string;
  employeeCode: string;
  emergencyContact?: string;
  showEmergency?: boolean;
  addressLines: string[];
  tel: string;
  fax: string;
  web: string;
  photo: PhotoRef | null;
  zoom: number;
  offsetX: number; // in pt, photo pan
  offsetY: number;
}

export interface Workspace {
  id: string;
  name: string;
  data: CardData;
  ownerId?: string | null;
  ownerUsername?: string | null;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface AddressPreset {
  id: string;
  name: string;
  locked?: boolean;
  lines: string[];
  tel: string;
  fax: string;
  web: string;
}
