import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

import { input } from '@inquirer/prompts';

describe('telemetry/identity', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalIsTTY: boolean;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-identity-test-${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
    originalIsTTY = process.stdin.isTTY ?? false;
    delete process.env.OPENSPEC_TELEMETRY_USER;
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    vi.mocked(input).mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  async function loadIdentity() {
    const mod = await import('../../src/telemetry/identity.js');
    mod.resetIdentityCacheForTests();
    return mod;
  }

  describe('validateUserId', () => {
    it('accepts email addresses', async () => {
      const { validateUserId } = await loadIdentity();
      expect(validateUserId('jane@codewalla.com')).toBe(true);
    });

    it('accepts usernames', async () => {
      const { validateUserId } = await loadIdentity();
      expect(validateUserId('jane.doe')).toBe(true);
    });

    it('rejects empty values', async () => {
      const { validateUserId } = await loadIdentity();
      expect(validateUserId('')).not.toBe(true);
    });
  });

  describe('resolveTelemetryUserId', () => {
    it('reads stored userId without re-prompting', async () => {
      const { writeStoredUserId, resolveTelemetryUserId } = await loadIdentity();
      await writeStoredUserId('stored@codewalla.com');

      const userId = await resolveTelemetryUserId({ prompt: false });
      expect(userId).toBe('stored@codewalla.com');
      expect(input).not.toHaveBeenCalled();
    });

    it('uses OPENSPEC_TELEMETRY_USER when set', async () => {
      process.env.OPENSPEC_TELEMETRY_USER = 'ci@codewalla.com';
      const { resolveTelemetryUserId } = await loadIdentity();
      expect(await resolveTelemetryUserId({ prompt: false })).toBe('ci@codewalla.com');
    });

    it('prompts once on interactive TTY and persists to identity file', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
      vi.mocked(input).mockResolvedValue('prompted@codewalla.com');

      const { resolveTelemetryUserId, getIdentityFilePath } = await loadIdentity();
      const userId = await resolveTelemetryUserId({ prompt: true });

      expect(userId).toBe('prompted@codewalla.com');
      expect(input).toHaveBeenCalledOnce();
      const stored = JSON.parse(fs.readFileSync(getIdentityFilePath(), 'utf-8'));
      expect(stored.userId).toBe('prompted@codewalla.com');
    });

    it('returns null on non-TTY without stored identity', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });

      const { resolveTelemetryUserId } = await loadIdentity();
      expect(await resolveTelemetryUserId({ prompt: true })).toBeNull();
      expect(input).not.toHaveBeenCalled();
    });

    it('writes identity file with mode 0600', async () => {
      const { writeStoredUserId, getIdentityFilePath } = await loadIdentity();
      await writeStoredUserId('secure@codewalla.com');
      const mode = fs.statSync(getIdentityFilePath()).mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  describe('requireTelemetryIdentity', () => {
    it('returns userId when identity file exists', async () => {
      const { writeStoredUserId, requireTelemetryIdentity } = await loadIdentity();
      await writeStoredUserId('stored@codewalla.com');
      await expect(requireTelemetryIdentity()).resolves.toBe('stored@codewalla.com');
    });

    it('throws TelemetryIdentityRequiredError when identity is missing', async () => {
      const { requireTelemetryIdentity, TelemetryIdentityRequiredError } = await loadIdentity();
      await expect(requireTelemetryIdentity()).rejects.toBeInstanceOf(TelemetryIdentityRequiredError);
    });
  });

  describe('setupTelemetryIdentity', () => {
    it('prompts when interactive and identity is missing', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
      vi.mocked(input).mockResolvedValue('setup@codewalla.com');

      const { setupTelemetryIdentity, getIdentityFilePath } = await loadIdentity();
      await expect(setupTelemetryIdentity({ interactive: true })).resolves.toBe('setup@codewalla.com');
      expect(JSON.parse(fs.readFileSync(getIdentityFilePath(), 'utf-8')).userId).toBe('setup@codewalla.com');
    });

    it('throws when non-interactive and identity is missing', async () => {
      const { setupTelemetryIdentity, TelemetryIdentityRequiredError } = await loadIdentity();
      await expect(setupTelemetryIdentity({ interactive: false })).rejects.toBeInstanceOf(
        TelemetryIdentityRequiredError
      );
    });

    it('returns existing identity without prompting', async () => {
      const { writeStoredUserId, setupTelemetryIdentity } = await loadIdentity();
      await writeStoredUserId('existing@codewalla.com');
      await expect(setupTelemetryIdentity({ interactive: true })).resolves.toBe('existing@codewalla.com');
      expect(input).not.toHaveBeenCalled();
    });
  });
});
