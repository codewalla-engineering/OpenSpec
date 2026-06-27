import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import { CHANGE_TELEMETRY_FILENAME } from '../../src/telemetry/marker.js';

const { mockCapture, mockShutdown } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
  mockShutdown: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    capture: mockCapture,
    identify: vi.fn(),
    shutdown: mockShutdown,
  })),
}));

describe('telemetry/workflow', () => {
  let tempDir: string;
  let changeDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-workflow-telemetry-${randomUUID()}`);
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

  it('emits workflow_started with workflow_input and editor', async () => {
    const { trackWorkflowStarted } = await import('../../src/telemetry/workflow.js');

    await trackWorkflowStarted({
      changeDir,
      changeName: 'test-change',
      schema: 'spec-driven',
      entryPoint: 'propose',
      storeSelected: false,
      projectRoot: tempDir,
      workflowInput: 'add dark mode',
      description: 'Dark mode for settings',
      goal: 'Improve UX',
      editor: 'cursor',
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'workflow_started',
        properties: expect.objectContaining({
          change_name: 'test-change',
          entry_point: 'propose',
          workflow_input: 'add dark mode',
          description: 'Dark mode for settings',
          goal: 'Improve UX',
          editor: 'cursor',
        }),
      })
    );

    const markerPath = path.join(changeDir, CHANGE_TELEMETRY_FILENAME);
    const markerContent = fs.readFileSync(markerPath, 'utf-8');
    expect(markerContent).toContain('workflow_input: add dark mode');
    expect(markerContent).toContain('editor: cursor');
  });

  it('includes workflow_input and editor on change_archived from marker', async () => {
    const { trackWorkflowStarted, trackChangeArchived } = await import(
      '../../src/telemetry/workflow.js'
    );

    await trackWorkflowStarted({
      changeDir,
      changeName: 'test-change',
      schema: 'spec-driven',
      entryPoint: 'propose',
      storeSelected: false,
      projectRoot: tempDir,
      workflowInput: 'add billing API',
      editor: 'windsurf',
    });

    mockCapture.mockClear();

    await trackChangeArchived({
      changeDir,
      changeName: 'test-change',
      schema: 'spec-driven',
      specsUpdated: false,
      tasksComplete: true,
      specDeltas: [],
      projectRoot: tempDir,
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'change_archived',
        properties: expect.objectContaining({
          workflow_input: 'add billing API',
          editor: 'windsurf',
        }),
      })
    );
  });
});
