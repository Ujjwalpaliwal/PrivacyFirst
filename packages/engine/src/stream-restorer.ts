import { Vault } from './vault.js';

/**
 * StreamRestorer buffers incoming streaming chunks to reliably restore
 * placeholders (e.g. [PERSON_01]) that may be split across chunk boundaries.
 */
export class StreamRestorer {
  private vault: Vault;
  private buffer: string = '';
  private readonly maxPlaceholderLength = 32;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  /**
   * Processes a newly received stream chunk.
   * Returns the restored text safe to emit immediately.
   */
  public processChunk(chunk: string): string {
    this.buffer += chunk;

    // Check if there is an open bracket near the end of the buffer
    const lastOpenBracket = this.buffer.lastIndexOf('[');

    if (lastOpenBracket !== -1) {
      const lastCloseBracket = this.buffer.lastIndexOf(']');

      // If the open bracket comes after the last close bracket, we might have an incomplete token
      if (lastOpenBracket > lastCloseBracket) {
        const potentialToken = this.buffer.slice(lastOpenBracket);

        // If it exceeds max length, it's not our placeholder format -> emit everything
        if (potentialToken.length <= this.maxPlaceholderLength) {
          const readyToProcess = this.buffer.slice(0, lastOpenBracket);
          this.buffer = potentialToken;
          return this.vault.restore(readyToProcess);
        }
      }
    }

    // If no unclosed bracket at tail, restore the entire buffer and clear it
    const emitText = this.vault.restore(this.buffer);
    this.buffer = '';
    return emitText;
  }

  /**
   * Flushes any remaining characters in the buffer upon stream completion.
   */
  public flush(): string {
    if (!this.buffer) return '';
    const remaining = this.vault.restore(this.buffer);
    this.buffer = '';
    return remaining;
  }
}
