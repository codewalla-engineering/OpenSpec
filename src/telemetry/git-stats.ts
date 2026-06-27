/**
 * Best-effort git stats for implementation_changed telemetry.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface GitDiffStats {
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  lines_changed: number;
}

export async function captureGitHead(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd,
      timeout: 2000,
    });
    const head = stdout.trim();
    return head || null;
  } catch {
    return null;
  }
}

function shouldExcludePath(filePath: string, excludeOpenspec: boolean): boolean {
  if (!excludeOpenspec) {
    return false;
  }
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('openspec/') || normalized.includes('/openspec/');
}

/**
 * Diff working tree (including staged/unstaged) against ref.
 */
export async function diffStatsSince(
  ref: string,
  cwd: string,
  excludeOpenspec = true
): Promise<GitDiffStats | null> {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--numstat', ref], {
      cwd,
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024,
    });

    let filesChanged = 0;
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of stdout.split('\n')) {
      if (!line.trim()) {
        continue;
      }
      const parts = line.split('\t');
      if (parts.length < 3) {
        continue;
      }
      const filePath = parts[2];
      if (shouldExcludePath(filePath, excludeOpenspec)) {
        continue;
      }
      filesChanged++;
      const added = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
      const removed = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
      linesAdded += Number.isNaN(added) ? 0 : added;
      linesRemoved += Number.isNaN(removed) ? 0 : removed;
    }

    return {
      files_changed: filesChanged,
      lines_added: linesAdded,
      lines_removed: linesRemoved,
      lines_changed: linesAdded + linesRemoved,
    };
  } catch {
    return null;
  }
}
