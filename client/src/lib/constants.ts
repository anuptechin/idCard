import type { AddressPreset, BrandKey, CardData } from '../types';

/* =========================================================================
   CARD GEOMETRY — measured to the point from the source artwork.
   Master coordinate system = PDF points (pt). 1 pt = 1/72 inch.
   Card = CR80 portrait: 153.034 x 240.919 pt  (53.98 x 85.0 mm).
   ========================================================================= */
export const CARD = { w: 153.034, h: 240.919 };
export const MM_PER_PT = 25.4 / 72;
export const INK = '#4D4D4F';

export const PHOTO_BOX = { x: 36, y: 28.3, w: 81.5, h: 96.2, r: 3.4 };

export const LAYOUT = {
  name: { cx: CARD.w / 2, baseline: 142.6, size: 14, min: 9, maxW: 138 },
  desig: { cx: CARD.w / 2, baseline: 150.4, size: 5.5, min: 4, maxW: 146 },
  emp: { cx: CARD.w / 2, baseline: 156.8, size: 5.5, label: 'Employee Code: ' },
  emergency: { cx: CARD.w / 2, baseline: 163.2, size: 5.5, label: 'Emergency Contact: ' },
  addr: { cx: CARD.w / 2, base0: 208.6, gap: 6.45, size: 5.5, maxW: 150 },
  contact: { cx: CARD.w / 2, baseline: 230.6, size: 5.5 },
};

/* Per-brand logo placement (target width in pt + vertical centre in pt). */
export interface BrandDef {
  key: BrandKey;
  name: string;
  caption: string;
  w: number;
  cy: number;
}
export const BRANDS: BrandDef[] = [
  { key: 'fabrics', name: 'Home Fabrics', caption: 'Live beautiful', w: 66, cy: 181 },
  { key: 'homestore', name: 'Home Store', caption: 'Home Store', w: 66, cy: 181 },
  { key: 'homeideas', name: 'Home Ideas', caption: 'Home ideas', w: 88, cy: 182 },
  { key: 'wordmark', name: 'Corporate', caption: "D'DECOR", w: 58, cy: 178 },
];

export const NAME_FAMILY = "'Helvetica Neue','HelveticaNeue','IDName',Arial,sans-serif";

export const DPI_OPTIONS = [300, 600, 1200];

export const DEFAULT_ADDRESSES: AddressPreset[] = [
  {
    id: 'corp',
    name: 'Corporate Office — 6th & 7th Floor',
    locked: true,
    lines: [
      '6th & 7th Floor, Unit No. 1461/1471, Bldg No.14',
      'Solitaire Corporate Park, 167 Guru Hargovindji Marg',
      'Chakala, Andheri (E), Mumbai 93',
    ],
    tel: '+91 22 6678 2000',
    fax: '+91 22 6678 2001',
    web: 'www.ddecor.com',
  },
  {
    id: 'ground',
    name: 'Ground Floor — Domestic Sales',
    locked: true,
    lines: [
      'Ground Floor, Unit No. 1401A/1401B, Bldg No. 14',
      'Solitaire Corporate Park, 167 Guru Hargovindji Marg',
      'Chakala, Andheri (E), Mumbai 93',
    ],
    tel: '+91 22 6678 2000',
    fax: '+91 22 4008 2001',
    web: 'www.ddecor.com',
  },
];

export function newCardData(): CardData {
  const a = DEFAULT_ADDRESSES[0];
  return {
    brand: 'fabrics',
    name: '',
    designation: '',
    employeeCode: '',
    emergencyContact: '',
    showEmergency: false,
    addressLines: a.lines.slice(),
    tel: a.tel,
    fax: a.fax,
    web: a.web,
    photo: null,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  };
}
