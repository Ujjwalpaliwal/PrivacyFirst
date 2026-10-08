import { EntityType, VaultEntry } from './types.js';

export class Vault {
  private placeholderToEntry = new Map<string, VaultEntry>();
  private normalizedToPlaceholder = new Map<string, string>();
  private counters: Record<string, number> = {};

  /**
   * Normalizes values so variations (e.g. spaces/hyphens in Aadhaar/Cards)
   * resolve deterministically to the identical placeholder.
   */
  public normalize(value: string, type: EntityType): string {
    if (type === 'AADHAAR' || type === 'CARD') {
      return value.replace(/\D/g, '');
    }
    if (type === 'EMAIL' || type === 'UPI' || type === 'PAN') {
      return value.trim().toLowerCase();
    }
    return value.trim();
  }

  private nextPlaceholder(type: EntityType): string {
    this.counters[type] = (this.counters[type] || 0) + 1;
    const num = String(this.counters[type]).padStart(2, '0');
    return `[${type}_${num}]`;
  }

  /**
   * Stores an original value in the vault and returns its placeholder.
   * If the normalized value already exists, returns the existing placeholder.
   */
  public store(original: string, type: EntityType): string {
    const key = `${type}:${this.normalize(original, type)}`;
    const existing = this.normalizedToPlaceholder.get(key);
    if (existing) {
      return existing;
    }

    const placeholder = this.nextPlaceholder(type);
    const entry: VaultEntry = { placeholder, original, type };

    this.placeholderToEntry.set(placeholder, entry);
    this.normalizedToPlaceholder.set(key, placeholder);

    return placeholder;
  }

  /**
   * Restores all placeholders present in the given text back to their original values.
   */
  public restore(text: string): string {
    let result = text;
    for (const [placeholder, entry] of this.placeholderToEntry.entries()) {
      result = result.split(placeholder).join(entry.original);
    }
    return result;
  }

  public getEntry(placeholder: string): VaultEntry | undefined {
    return this.placeholderToEntry.get(placeholder);
  }

  public getAllEntries(): VaultEntry[] {
    return Array.from(this.placeholderToEntry.values());
  }

  public clear(): void {
    this.placeholderToEntry.clear();
    this.normalizedToPlaceholder.clear();
    this.counters = {};
  }
}
