import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';
import { CHANGE_TELEMETRY_FILENAME } from '../../src/telemetry/marker.js';

describe('instructions modify command', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-modify-instructions-'));
    changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  async function createCompleteChange(
    changeName: string,
    tasksContent = '## Tasks\n- [ ] Task 1'
  ): Promise<string> {
    const changeDir = path.join(changesDir, changeName);
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '## Why\nTest\n\n## What Changes\n- **test:** x');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');
    await fs.mkdir(path.join(changeDir, 'specs'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'test-spec.md'), '## Purpose\nTest spec.');
    await fs.writeFile(path.join(changeDir, 'plan.md'), '## Code Map\n- src/example.ts\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
    return changeDir;
  }

  function parseJson(stdout: string): Record<string, unknown> {
    return JSON.parse(stdout) as Record<string, unknown>;
  }

  it('returns modify scope JSON for a complete change', async () => {
    await createCompleteChange('modify-ready');

    const result = await runCLI(
      [
        'instructions',
        'modify',
        '--change',
        'modify-ready',
        '--artifact',
        'design',
        '--workflow-input',
        'use CSS variables',
        '--json',
      ],
      { cwd: tempDir, env: { OPENSPEC_TELEMETRY_USER: 'test@codewalla.com' } }
    );

    expect(result.exitCode).toBe(0);
    const json = parseJson(result.stdout);
    expect(json.changeName).toBe('modify-ready');
    expect(json.sourceArtifact).toBe('design');
    expect(json.phase).toBe('pre_apply');
    expect(json.downstreamArtifacts).toEqual(['plan', 'tasks']);
    expect(json.artifactsToUpdate).toEqual(['design', 'plan', 'tasks']);
    expect(json.modifyInput).toBe('use CSS variables');
  });

  it('blocks modify when apply has started', async () => {
    await createCompleteChange('modify-blocked', '## Tasks\n- [x] Task 1 done\n- [ ] Task 2');

    const result = await runCLI(
      [
        'instructions',
        'modify',
        '--change',
        'modify-blocked',
        '--artifact',
        'design',
        '--json',
      ],
      { cwd: tempDir }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr + result.stdout).toMatch(/pre-apply/i);
  });

  it('blocks modify when source artifact is missing', async () => {
    const changeDir = path.join(changesDir, 'missing-design');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '## Why\nTest\n\n## What Changes\n- **test:** x');
    await fs.writeFile(path.join(changeDir, 'plan.md'), '## Code Map\n- src/example.ts\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [ ] Task 1');

    const result = await runCLI(
      [
        'instructions',
        'modify',
        '--change',
        'missing-design',
        '--artifact',
        'design',
        '--json',
      ],
      { cwd: tempDir }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr + result.stdout).toMatch(/does not exist yet/i);
  });

  it('persists modify history in telemetry marker', async () => {
    const changeDir = await createCompleteChange('modify-telemetry');

    await runCLI(
      [
        'instructions',
        'modify',
        '--change',
        'modify-telemetry',
        '--artifact',
        'proposal',
        '--workflow-input',
        'add OAuth capability',
        '--json',
      ],
      { cwd: tempDir, env: { OPENSPEC_TELEMETRY_USER: 'test@codewalla.com' } }
    );

    const marker = await fs.readFile(path.join(changeDir, CHANGE_TELEMETRY_FILENAME), 'utf-8');
    expect(marker).toContain('modify_history');
    expect(marker).toContain('add OAuth capability');
    expect(marker).toContain('source_artifact: proposal');
  });
});
