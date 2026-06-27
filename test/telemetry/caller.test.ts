import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('telemetry/caller', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalIsTTY = process.stdin.isTTY;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('CURSOR_') || key.startsWith('DEVIN')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
  });

  it('uses OPENSPEC_CALLER override when set', async () => {
    process.env.OPENSPEC_CALLER = 'custom-agent';
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    const { resolveCaller } = await import('../../src/telemetry/caller.js');
    expect(resolveCaller()).toBe('custom-agent');
  });

  it('detects devin from DEVIN env vars', async () => {
    delete process.env.OPENSPEC_CALLER;
    process.env.DEVIN_SESSION_ID = 'abc';
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const { resolveCaller } = await import('../../src/telemetry/caller.js');
    expect(resolveCaller()).toBe('devin');
  });

  it('detects ci when CI=true', async () => {
    delete process.env.OPENSPEC_CALLER;
    delete process.env.DEVIN_SESSION_ID;
    process.env.CI = 'true';
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const { resolveCaller } = await import('../../src/telemetry/caller.js');
    expect(resolveCaller()).toBe('ci');
  });

  it('detects automation for non-interactive stdin', async () => {
    delete process.env.OPENSPEC_CALLER;
    delete process.env.CI;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const { resolveCaller } = await import('../../src/telemetry/caller.js');
    expect(resolveCaller()).toBe('automation');
  });

  it('detects human for interactive terminal', async () => {
    delete process.env.OPENSPEC_CALLER;
    delete process.env.CI;
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    const { resolveCaller } = await import('../../src/telemetry/caller.js');
    expect(resolveCaller()).toBe('human');
  });
});
