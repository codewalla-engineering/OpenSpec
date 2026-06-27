import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export interface ApplyArtifactFingerprintInput {
  specPaths: string[];
  tasksPath?: string | null;
  planPath?: string | null;
}

function hashFileContent(
  hash: ReturnType<typeof createHash>,
  label: string,
  filePath: string
): void {
  hash.update(`${label}:`);
  hash.update(filePath);
  hash.update('\0');
  hash.update(readFileSync(filePath, 'utf-8'));
  hash.update('\0');
}

/**
 * SHA-256 fingerprint of delta specs and optional plan/tasks file contents.
 */
export function fingerprintApplyArtifacts(input: ApplyArtifactFingerprintInput): string {
  const sorted = [...input.specPaths].sort();
  const hash = createHash('sha256');
  for (const specPath of sorted) {
    hashFileContent(hash, 'spec', specPath);
  }
  if (input.planPath && existsSync(input.planPath)) {
    hashFileContent(hash, 'plan', input.planPath);
  }
  if (input.tasksPath && existsSync(input.tasksPath)) {
    hashFileContent(hash, 'tasks', input.tasksPath);
  }
  return hash.digest('hex');
}

/**
 * @deprecated Use fingerprintApplyArtifacts
 */
export function fingerprintSpecFiles(specPaths: string[], tasksPath?: string | null): string {
  return fingerprintApplyArtifacts({ specPaths, tasksPath });
}
