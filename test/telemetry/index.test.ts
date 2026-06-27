import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

const { mockCapture, mockIdentify, mockShutdown } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
  mockIdentify: vi.fn(),
  mockShutdown: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: mockCapture,
    identify: mockIdentify,
    shutdown: mockShutdown,
  })),
}));

describe('telemetry/index', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-telemetry-test-${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    process.env.OPENSPEC_TELEMETRY_USER = 'dev@codewalla.com';
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(async () => {
    process.env = originalEnv;
    try {
      const { shutdown, resetTelemetryForTests } = await import('../../src/telemetry/index.js');
      resetTelemetryForTests();
      await shutdown();
      const { resetIdentityCacheForTests } = await import('../../src/telemetry/identity.js');
      resetIdentityCacheForTests();
    } catch {
      // ignore if modules were not loaded
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    fetchSpy.mockRestore();
  });

  describe('trackCommand', () => {
    it('should not track when userId is unavailable', async () => {
      delete process.env.OPENSPEC_TELEMETRY_USER;
      const { PostHog } = await import('posthog-node');
      const { trackCommand } = await import('../../src/telemetry/index.js');

      await trackCommand('test', '1.0.0');

      expect(PostHog).not.toHaveBeenCalled();
    });

    it('should track with Codewalla PostHog defaults when userId is set', async () => {
      const { PostHog } = await import('posthog-node');
      const { captureEvent, DEFAULT_POSTHOG_HOST } = await import('../../src/telemetry/client.js');

      await captureEvent('command_executed', { command: 'init', version: '1.0.0' });

      expect(PostHog).toHaveBeenCalledWith(
        expect.stringContaining('phc_'),
        expect.objectContaining({
          host: DEFAULT_POSTHOG_HOST,
          flushAt: 1,
          flushInterval: 0,
          fetchRetryCount: 0,
          requestTimeout: 1000,
          preloadFeatureFlags: false,
          disableRemoteConfig: true,
          disableSurveys: true,
          fetch: expect.any(Function),
        })
      );

      expect(mockCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          distinctId: 'dev@codewalla.com',
          event: 'command_executed',
          properties: expect.objectContaining({
            command: 'init',
            surface: 'cli',
            $ip: null,
          }),
        })
      );
    });

    it('trackCommand delegates to captureEvent', async () => {
      const { trackCommand } = await import('../../src/telemetry/index.js');
      await trackCommand('status', '1.0.0');
      expect(mockCapture).toHaveBeenCalled();
    });

    it('should use distinct_id equal to email/username, never a UUID', async () => {
      const { captureEvent } = await import('../../src/telemetry/client.js');
      await captureEvent('command_executed', { command: 'status', version: '1.0.0' });

      const captureArg = mockCapture.mock.calls[0][0];
      expect(captureArg.distinctId).toBe('dev@codewalla.com');
      expect(captureArg.distinctId).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should return synthetic 204 when fetch throws', async () => {
      const { PostHog } = await import('posthog-node');
      const { trackCommand } = await import('../../src/telemetry/index.js');
      await trackCommand('test', '1.0.0');

      const fetchFn = (PostHog as any).mock.calls[0][1].fetch as typeof fetch;
      fetchSpy.mockRejectedValueOnce(new Error('network down'));

      const response = await fetchFn('https://us.i.posthog.com/batch/', { method: 'POST' });
      expect(response.status).toBe(204);
    });
  });

  describe('canSendTelemetry', () => {
    it('returns true when OPENSPEC_TELEMETRY_USER is set', async () => {
      const { canSendTelemetry } = await import('../../src/telemetry/index.js');
      expect(await canSendTelemetry()).toBe(true);
    });

    it('returns false when no identity is available', async () => {
      delete process.env.OPENSPEC_TELEMETRY_USER;
      const { canSendTelemetry } = await import('../../src/telemetry/index.js');
      expect(await canSendTelemetry()).toBe(false);
    });
  });

  describe('shutdown', () => {
    it('should not throw when no client exists', async () => {
      const { shutdown } = await import('../../src/telemetry/index.js');
      await expect(shutdown()).resolves.not.toThrow();
    });
  });
});
