import nlp from 'compromise';
import { DETECTORS } from './detectors.js';
import { resolveOverlaps } from './overlap.js';
import { DetectedSpan, Finding, SanitizeResult } from './types.js';
import { Vault } from './vault.js';

export interface SanitizeOptions {
  allowList?: Set<string>;
  enableNER?: boolean;
}

const COMMON_NON_NAME_WORDS = new Set([
  'Yesterday', 'Tomorrow', 'Today', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
  'Please', 'Help', 'Could', 'Would', 'Should', 'Thanks', 'Thank', 'Sincerely', 'Regards', 'However', 'Therefore'
]);

/**
 * Extracts free-standing person names using lightweight local NER (compromise + capitalized name patterns).
 */
function extractNamesWithNER(text: string, allowList: Set<string>): DetectedSpan[] {
  const spans: DetectedSpan[] = [];
  const foundNames = new Set<string>();

  try {
    const doc = nlp(text);
    // 1. Compromise NLP recognized person entities
    const people = doc.people().out('array') as string[];
    for (const p of people) {
      if (p && p.length > 2) foundNames.add(p.trim());
    }

    // 2. Capitalized full names (2-3 title-cased words, e.g. "Vikram Malhotra", "Sarah Connor")
    const nameRegex = /\b([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})\b/g;
    let match: RegExpExecArray | null;
    while ((match = nameRegex.exec(text)) !== null) {
      const candidate = match[1];
      const firstWord = candidate.split(' ')[0];
      if (!COMMON_NON_NAME_WORDS.has(firstWord) && !allowList.has(candidate)) {
        foundNames.add(candidate);
      }
    }

    for (const name of foundNames) {
      if (!name || allowList.has(name)) continue;

      let idx = 0;
      while ((idx = text.indexOf(name, idx)) !== -1) {
        const before = idx > 0 ? text[idx - 1] : ' ';
        const after = idx + name.length < text.length ? text[idx + name.length] : ' ';

        if (!/[a-zA-Z0-9]/.test(before) && !/[a-zA-Z0-9]/.test(after)) {
          spans.push({
            type: 'PERSON',
            label: 'Person (NER)',
            original: name,
            start: idx,
            end: idx + name.length
          });
        }
        idx += name.length;
      }
    }
  } catch {
    // Fallback if NLP parser encounters syntax error
  }
  return spans;
}

/**
 * Scans input text with all configured detectors and local NER pass,
 * resolves overlapping spans, registers values in the vault, and replaces matches.
 */
export function sanitize(
  text: string,
  vault: Vault,
  options: SanitizeOptions = {}
): SanitizeResult {
  const allowList = options.allowList || new Set<string>();
  const enableNER = options.enableNER !== false;
  const detectedSpans: DetectedSpan[] = [];

  // 1. Standard Rule & Regex Detectors
  for (const detector of DETECTORS) {
    const regex = new RegExp(detector.regex.source, detector.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const capturedValue =
        detector.captureGroup !== undefined && match[detector.captureGroup] !== undefined
          ? match[detector.captureGroup]
          : fullMatch;

      if (!capturedValue) continue;

      if (allowList.has(capturedValue)) continue;

      if (detector.validate && !detector.validate(capturedValue)) {
        continue;
      }

      const offsetInMatch = fullMatch.indexOf(capturedValue);
      const start = match.index + (offsetInMatch >= 0 ? offsetInMatch : 0);
      const end = start + capturedValue.length;

      detectedSpans.push({
        type: detector.type,
        label: detector.label,
        original: capturedValue,
        start,
        end
      });
    }
  }

  // 2. Local NER Pass (Free-standing person names)
  if (enableNER) {
    const nerSpans = extractNamesWithNER(text, allowList);
    detectedSpans.push(...nerSpans);
  }

  // 3. Resolve Overlaps (longest match & priority resolution)
  const resolvedSpans = resolveOverlaps(detectedSpans);

  let sanitized = '';
  let cursor = 0;
  const findings: Finding[] = [];

  for (const span of resolvedSpans) {
    sanitized += text.slice(cursor, span.start);
    const placeholder = vault.store(span.original, span.type);
    sanitized += placeholder;
    cursor = span.end;

    findings.push({
      type: span.type,
      label: span.label,
      original: span.original,
      placeholder,
      action: 'MASK',
      start: span.start,
      end: span.end
    });
  }

  sanitized += text.slice(cursor);

  return {
    sanitized,
    findings
  };
}

/**
 * Restores a sanitized text string using the mappings stored in the vault.
 */
export function restore(text: string, vault: Vault): string {
  return vault.restore(text);
}
