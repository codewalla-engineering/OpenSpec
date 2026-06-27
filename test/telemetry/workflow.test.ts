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

  it('emits artifact_was_done on artifact_instructions_requested', async () => {
    const proposalPath = path.join(changeDir, 'proposal.md');
    fs.writeFileSync(proposalPath, '# Proposal\n');

    const { trackArtifactInstructions } = await import('../../src/telemetry/workflow.js');
    mockCapture.mockClear();

    await trackArtifactInstructions({
      changeDir,
      changeName: 'test-change',
      artifactId: 'proposal',
      artifactWasDone: true,
      artifactPaths: [proposalPath],
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'artifact_instructions_requested',
        properties: expect.objectContaining({
          artifact_was_done: true,
          artifact_paths: ['proposal.md'],
          artifact_body: '# Proposal',
        }),
      })
    );
  });

  it('emits artifact_modify_requested with modify_input', async () => {
    const { trackArtifactModifyRequested } = await import('../../src/telemetry/workflow.js');
    mockCapture.mockClear();

    await trackArtifactModifyRequested({
      changeDir,
      changeName: 'test-change',
      schema: 'spec-driven',
      sourceArtifactId: 'design',
      downstreamArtifactIds: ['plan', 'tasks'],
      artifactsToUpdate: ['design', 'plan', 'tasks'],
      modifyInput: 'use CSS variables',
      editor: 'cursor',
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'artifact_modify_requested',
        properties: expect.objectContaining({
          change_name: 'test-change',
          source_artifact_id: 'design',
          modify_input: 'use CSS variables',
          phase: 'pre_apply',
        }),
      })
    );

    const marker = fs.readFileSync(path.join(changeDir, CHANGE_TELEMETRY_FILENAME), 'utf-8');
    expect(marker).toContain('modify_history');
    expect(marker).toContain('use CSS variables');
  });
});
