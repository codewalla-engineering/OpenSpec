import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * SHA-256 fingerprint of delta spec file contents (sorted by path).
 */
export function fingerprintSpecFiles(specPaths: string[]): string {
  const sorted = [...specPaths].sort();
  const hash = createHash('sha256');
  for (const specPath of sorted) {
    hash.update(specPath);
    hash.update('\0');
    hash.update(readFileSync(specPath, 'utf-8'));
    hash.update('\0');
  }
  return hash.digest('hex');
}
