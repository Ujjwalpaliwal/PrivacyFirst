export type EntityType =
  | 'AADHAAR'
  | 'PAN'
  | 'CARD'
  | 'EMAIL'
  | 'PHONE'
  | 'UPI'
  | 'IFSC'
  | 'GSTIN'
  | 'IP'
  | 'SECRET'
  | 'PERSON';

export interface DetectorDefinition {
  type: EntityType;
  label: string;
  regex: RegExp;
  validate?: (match: string) => boolean;
  captureGroup?: number;
}

export interface DetectedSpan {
  type: EntityType;
  label: string;
  original: string;
  start: number;
  end: number;
}

export interface Finding {
  type: EntityType;
  label: string;
  original: string;
  placeholder: string;
  action: 'MASK' | 'KEEP';
  start?: number;
  end?: number;
}

export interface SanitizeResult {
  sanitized: string;
  findings: Finding[];
}

export interface VaultEntry {
  placeholder: string;
  original: string;
  type: EntityType;
}
