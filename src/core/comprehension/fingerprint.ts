import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

/**
 * SHA-256 fingerprint of delta spec and optional tasks file contents.
 */
export function fingerprintSpecFiles(specPaths: string[], tasksPath?: string | null): string {
  const sorted = [...specPaths].sort();
  const hash = createHash('sha256');
  for (const specPath of sorted) {
    hash.update('spec:');
    hash.update(specPath);
    hash.update('\0');
    hash.update(readFileSync(specPath, 'utf-8'));
    hash.update('\0');
  }
  if (tasksPath && existsSync(tasksPath)) {
    hash.update('tasks:');
    hash.update(tasksPath);
    hash.update('\0');
    hash.update(readFileSync(tasksPath, 'utf-8'));
    hash.update('\0');
  }
  return hash.digest('hex');
}
