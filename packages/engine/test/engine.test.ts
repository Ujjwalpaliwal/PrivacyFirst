import { describe, it, expect, beforeEach } from 'vitest';
import {
  Vault,
  sanitize,
  restore,
  validateVerhoeff,
  validateLuhn,
  StreamRestorer
} from '../src/index.js';

describe('PrivacyFirst Engine', () => {
  let vault: Vault;

  beforeEach(() => {
    vault = new Vault();
  });

  describe('Validators', () => {
    it('validates Aadhaar checksum using Verhoeff algorithm', () => {
      // 234567890124 is a valid Verhoeff 12-digit number
      expect(validateVerhoeff('234567890124')).toBe(true);
      expect(validateVerhoeff('2345 6789 0124')).toBe(true);

      // Invalid Aadhaar numbers
      expect(validateVerhoeff('123456789012')).toBe(false);
      expect(validateVerhoeff('111111111111')).toBe(false);
    });

    it('validates Card numbers using Luhn algorithm', () => {
      // Standard test card numbers (Luhn valid)
      expect(validateLuhn('4111 1111 1111 1111')).toBe(true);
      expect(validateLuhn('4111111111111111')).toBe(true);

      // Invalid cards
      expect(validateLuhn('4111 1111 1111 1112')).toBe(false);
      expect(validateLuhn('1234')).toBe(false);
    });
  });

  describe('Vault Normalization & Deduplication', () => {
    it('maps spaced and unspaced Aadhaar to the identical placeholder', () => {
      const ph1 = vault.store('2345 6789 0124', 'AADHAAR');
      const ph2 = vault.store('234567890124', 'AADHAAR');

      expect(ph1).toBe('[AADHAAR_01]');
      expect(ph2).toBe('[AADHAAR_01]');
      expect(vault.getAllEntries().length).toBe(1);
    });

    it('maps lowercase and uppercase email/PAN to the same placeholder', () => {
      const ph1 = vault.store('rahul@acme.in', 'EMAIL');
      const ph2 = vault.store('RAHUL@ACME.IN', 'EMAIL');

      expect(ph1).toBe('[EMAIL_01]');
      expect(ph2).toBe('[EMAIL_01]');
    });
  });

  describe('Sanitization & Detection', () => {
    it('sanitizes tax prompt correctly (Use Case A)', () => {
      const input =
        'My name is Rahul Sharma, PAN ABCDE1234F, Aadhaar 2345 6789 0124, email rahul@acme.in. My salary is 18,00,000 INR. Help me calculate my tax.';

      const result = sanitize(input, vault);

      expect(result.sanitized).toContain('[PERSON_01]');
      expect(result.sanitized).toContain('[PAN_01]');
      expect(result.sanitized).toContain('[AADHAAR_01]');
      expect(result.sanitized).toContain('[EMAIL_01]');
      expect(result.sanitized).toContain('18,00,000 INR'); // amounts kept

      // Reverse restoration
      const restored = restore(result.sanitized, vault);
      expect(restored).toBe(input);
    });

    it('does NOT mask invalid Aadhaar numbers', () => {
      const input = 'My invalid Aadhaar is 1234 5678 9012.';
      const result = sanitize(input, vault);

      expect(result.sanitized).toBe(input);
      expect(result.findings.length).toBe(0);
    });

    it('sanitizes environment secrets (Use Case B)', () => {
      const input = `DATABASE_URL=postgres://admin:p@ssw0rd@prod.db.internal:5432/app\nOPENAI_API_KEY=sk-proj-1234567890abcdef12345678`;
      const result = sanitize(input, vault);

      expect(result.sanitized).toContain('[SECRET_01]');
      expect(result.sanitized).toContain('[SECRET_02]');
      expect(result.sanitized).not.toContain('p@ssw0rd');
      expect(result.sanitized).not.toContain('sk-proj-1234567890abcdef12345678');

      const restored = restore(result.sanitized, vault);
      expect(restored).toBe(input);
    });

    it('respects allowList', () => {
      const input = 'Contact me at admin@company.com or rahul@acme.in';
      const allowList = new Set(['admin@company.com']);

      const result = sanitize(input, vault, { allowList });

      expect(result.sanitized).toContain('admin@company.com');
      expect(result.sanitized).toContain('[EMAIL_01]');
    });

    it('detects free-standing person names via local NER (compromise)', () => {
      const input = 'Yesterday, Vikram Malhotra met Sarah Connor to sign the document.';
      const result = sanitize(input, vault);

      expect(result.sanitized).toContain('[PERSON_01]');
      expect(result.sanitized).toContain('[PERSON_02]');
      expect(result.sanitized).not.toContain('Vikram Malhotra');
      expect(result.sanitized).not.toContain('Sarah Connor');

      const restored = restore(result.sanitized, vault);
      expect(restored).toBe(input);
    });
  });

  describe('StreamRestorer (Block 2)', () => {
    it('restores placeholders split across streaming chunks', () => {
      vault.store('Rahul Sharma', 'PERSON'); // -> [PERSON_01]

      const restorer = new StreamRestorer(vault);

      // Simulate chunk 1 with start of token
      const c1 = restorer.processChunk('Hello [PER');
      expect(c1).toBe('Hello ');

      // Simulate chunk 2 with remainder of token and trailing word
      const c2 = restorer.processChunk('SON_01], how are you?');
      expect(c2).toBe('Rahul Sharma, how are you?');

      const end = restorer.flush();
      expect(end).toBe('');
    });

    it('handles streams with no placeholders seamlessly', () => {
      const restorer = new StreamRestorer(vault);
      const c1 = restorer.processChunk('This is a plain message ');
      const c2 = restorer.processChunk('without any tokens.');

      expect(c1).toBe('This is a plain message ');
      expect(c2).toBe('without any tokens.');
      expect(restorer.flush()).toBe('');
    });
  });
});
