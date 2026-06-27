import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import { CHANGE_TELEMETRY_FILENAME } from '../../src/telemetry/marker.js';

const { mockCapture } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
}));

vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: mockCapture,
    identify: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('telemetry/comprehension', () => {
  let tempDir: string;
  let changeDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-comprehension-telemetry-${randomUUID()}`);
    changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
    fs.mkdirSync(changeDir, { recursive: true });
    originalEnv = { ...process.env };
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    process.env.OPENSPEC_TELEMETRY_USER = 'dev@codewalla.com';
    vi.clearAllMocks();
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
      // ignore
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('shouldEmitComprehensionGateChecked skips unchanged gate state', async () => {
    const { shouldEmitComprehensionGateChecked } = await import(
      '../../src/telemetry/comprehension.js'
    );
    expect(
      shouldEmitComprehensionGateChecked(
        {
          comprehension_gate_last_emitted: { passed: false, best_score_percent: 60 },
        },
        false,
        60
      )
    ).toBe(false);
    expect(
      shouldEmitComprehensionGateChecked(
        {
          comprehension_gate_last_emitted: { passed: false, best_score_percent: 60 },
        },
        true,
        100
      )
    ).toBe(true);
  });

  it('increments authoritative attempt counters in marker', async () => {
    const { incrementComprehensionAttempt, incrementComprehensionFailureCount } = await import(
      '../../src/telemetry/comprehension.js'
    );

    const first = await incrementComprehensionAttempt(changeDir);
    expect(first.attempt).toBe(1);
    expect(first.failureCountBefore).toBe(0);

    await incrementComprehensionFailureCount(changeDir);
    const second = await incrementComprehensionAttempt(changeDir);
    expect(second.attempt).toBe(2);
    expect(second.failureCountBefore).toBe(1);

    const marker = fs.readFileSync(path.join(changeDir, CHANGE_TELEMETRY_FILENAME), 'utf-8');
    expect(marker).toContain('comprehension_attempt_count: 2');
    expect(marker).toContain('comprehension_failure_count: 1');
  });

  it('emits comprehension_attempt with increment on failure', async () => {
    const { trackComprehensionAttempt } = await import('../../src/telemetry/comprehension.js');

    await trackComprehensionAttempt({
      changeDir,
      changeName: 'test-change',
      attempt: 1,
      scorePercent: 60,
      thresholdPercent: 80,
      questionCount: 5,
      passed: false,
      failureCountBefore: 0,
      contextFiles: {},
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'comprehension_attempt',
        properties: expect.objectContaining({
          result: 'failed',
          attempt: 1,
          gap_to_pass: 20,
          $increment: { comprehension_failures_total: 1 },
        }),
      })
    );
  });

  it('emits comprehension_attempt with next_milestone on pass', async () => {
    const { trackComprehensionAttempt } = await import('../../src/telemetry/comprehension.js');

    await trackComprehensionAttempt({
      changeDir,
      changeName: 'test-change',
      attempt: 3,
      scorePercent: 100,
      thresholdPercent: 80,
      questionCount: 5,
      passed: true,
      failureCountBefore: 2,
      nextMilestone: 'apply_ready',
      contextFiles: {},
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'comprehension_attempt',
        properties: expect.objectContaining({
          result: 'passed',
          next_milestone: 'apply_ready',
          failure_count: 2,
          $set: {
            comprehension_last_pass_attempt: 3,
            comprehension_last_pass_failures_before: 2,
          },
        }),
      })
    );
  });

  it('dedupes comprehension_gate_checked telemetry', async () => {
    const { trackComprehensionGateChecked } = await import('../../src/telemetry/comprehension.js');

    const gateInfo = {
      required: true,
      passed: false,
      thresholdPercent: 80,
      bestScorePercent: 60,
      questionCount: 5,
      questionAllocation: {},
      optionsPerQuestion: 3,
      requirementCount: 1,
      scenarioCount: 1,
      pendingTaskCount: 1,
      attempts: 1,
    };

    await trackComprehensionGateChecked({
      changeDir,
      changeName: 'test-change',
      passed: false,
      gateInfo,
      state: 'blocked',
      contextFiles: {},
    });
    await trackComprehensionGateChecked({
      changeDir,
      changeName: 'test-change',
      passed: false,
      gateInfo,
      state: 'blocked',
      contextFiles: {},
    });

    const gateEvents = mockCapture.mock.calls.filter((call) => call[0].event === 'comprehension_gate_checked');
    expect(gateEvents).toHaveLength(1);
    expect(gateEvents[0][0].properties).toEqual(
      expect.objectContaining({
        best_score_percent: 60,
        state: 'blocked',
      })
    );
  });
});
