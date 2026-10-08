import { DetectorDefinition } from './types.js';
import { validateVerhoeff, validateLuhn } from './validators.js';

export const DETECTORS: DetectorDefinition[] = [
  // 1. PAN (India) — 5 uppercase letters + 4 digits + 1 uppercase letter
  {
    type: 'PAN',
    label: 'PAN',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g
  },
  // 2. Aadhaar (India) — 12 digits, optional spaces/hyphens every 4 digits, Verhoeff validated
  {
    type: 'AADHAAR',
    label: 'Aadhaar',
    regex: /\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/g,
    validate: (match: string) => validateVerhoeff(match)
  },
  // 3. Credit / Debit Cards — 13-19 digits, Luhn validated
  {
    type: 'CARD',
    label: 'Card',
    regex: /\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{1,4}(?:[\s\-]?\d{1,3})?)\b/g,
    validate: (match: string) => validateLuhn(match)
  },
  // 4. Email address
  {
    type: 'EMAIL',
    label: 'Email',
    regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g
  },
  // 5. Phone number (India 10-digit with optional +91 / 0)
  {
    type: 'PHONE',
    label: 'Phone',
    regex: /(?:\+91[\s\-]?|0)?[6-9]\d{4}[\s\-]?\d{5}\b/g
  },
  // 6. UPI ID (handle@provider, not followed by email dot-tld)
  {
    type: 'UPI',
    label: 'UPI ID',
    regex: /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}(?!\.[a-zA-Z]{2,})\b/g,
    validate: (match: string) => {
      const parts = match.split('@');
      return Boolean(parts[0] && /[a-zA-Z]/.test(parts[0]) && parts[0].length >= 3);
    }
  },
  // 7. IFSC Code (Bank routing in India: 4 letters, 0, 6 alpha-numeric)
  {
    type: 'IFSC',
    label: 'IFSC',
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g
  },
  // 8. GSTIN (Goods & Services Tax Identification Number: 15 chars)
  {
    type: 'GSTIN',
    label: 'GSTIN',
    regex: /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g
  },
  // 9. IPv4 Address
  {
    type: 'IP',
    label: 'IP Address',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    validate: (match: string) => !match.startsWith('127.') && !match.startsWith('0.')
  },
  // 10. Secrets & API Keys in key=value or "key": "value" patterns
  {
    type: 'SECRET',
    label: 'Secret',
    regex: /(?:(?:api[_\-]?key|secret|token|password|passwd|pwd|auth|bearer|credential|privkey)s?\s*[:=]\s*["']?)([A-Za-z0-9\/+_\-]{16,})/gi,
    captureGroup: 1
  },
  // 11. Database Connection URLs
  {
    type: 'SECRET',
    label: 'Database URL',
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|sqlite):\/\/[^\s"'`,;)]+/gi
  },
  // 12. Contextual Person Names heuristic
  {
    type: 'PERSON',
    label: 'Person',
    regex: /\b(?:my name is|i am|i'm|name[:]\s*|user[:]\s*)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g,
    captureGroup: 1
  }
];
