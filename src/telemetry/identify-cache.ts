/**
 * Cross-process throttle for PostHog identify() calls.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { getGlobalConfigDir } from '../core/global-config.js';

export const IDENTIFY_STATE_FILENAME = 'telemetry-identify-state.json';
const IDENTIFY_TTL_MS = 24 * 60 * 60 * 1000;

interface IdentifyState {
  userId: string;
  identifiedAt: string;
}

export function getIdentifyStatePath(): string {
  return path.join(getGlobalConfigDir(), IDENTIFY_STATE_FILENAME);
}

export async function shouldIdentifyUser(userId: string): Promise<boolean> {
  try {
    const content = await fs.readFile(getIdentifyStatePath(), 'utf-8');
    const parsed = JSON.parse(content) as IdentifyState;
    if (parsed.userId !== userId || !parsed.identifiedAt) {
      return true;
    }
    const identifiedAt = Date.parse(parsed.identifiedAt);
    if (Number.isNaN(identifiedAt)) {
      return true;
    }
    return Date.now() - identifiedAt >= IDENTIFY_TTL_MS;
  } catch {
    return true;
  }
}

export async function markUserIdentified(userId: string): Promise<void> {
  const dir = getGlobalConfigDir();
  await fs.mkdir(dir, { recursive: true });
  const state: IdentifyState = {
    userId,
    identifiedAt: new Date().toISOString(),
  };
  await fs.writeFile(getIdentifyStatePath(), JSON.stringify(state, null, 2), { mode: 0o600 });
}

/** @internal Test helper */
export async function clearIdentifyStateForTests(): Promise<void> {
  try {
    await fs.unlink(getIdentifyStatePath());
  } catch {
    // ignore
  }
}
