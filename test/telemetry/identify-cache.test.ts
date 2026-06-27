import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

describe('telemetry/identify-cache', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-identify-cache-${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('requires identify when no cache exists', async () => {
    const { shouldIdentifyUser } = await import('../../src/telemetry/identify-cache.js');
    expect(await shouldIdentifyUser('dev@codewalla.com')).toBe(true);
  });

  it('skips identify within 24h TTL for same user', async () => {
    const { shouldIdentifyUser, markUserIdentified } = await import(
      '../../src/telemetry/identify-cache.js'
    );
    await markUserIdentified('dev@codewalla.com');
    expect(await shouldIdentifyUser('dev@codewalla.com')).toBe(false);
  });

  it('requires identify when cached user differs', async () => {
    const { shouldIdentifyUser, markUserIdentified } = await import(
      '../../src/telemetry/identify-cache.js'
    );
    await markUserIdentified('dev@codewalla.com');
    expect(await shouldIdentifyUser('other@codewalla.com')).toBe(true);
  });
});
