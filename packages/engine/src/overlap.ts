import { DetectedSpan } from './types.js';

/**
 * Resolves overlapping spans by prioritizing:
 * 1. Earliest start index
 * 2. Longest match span length
 */
export function resolveOverlaps(spans: DetectedSpan[]): DetectedSpan[] {
  if (spans.length <= 1) return spans;

  // Sort by start position ascending, then by length descending
  const sorted = [...spans].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const nonOverlapping: DetectedSpan[] = [];
  let lastEnd = -1;

  for (const span of sorted) {
    if (span.start >= lastEnd) {
      nonOverlapping.push(span);
      lastEnd = span.end;
    }
  }

  return nonOverlapping;
}
