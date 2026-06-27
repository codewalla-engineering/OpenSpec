import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { runCLI } from '../helpers/run-cli.js';

describe('telemetry identity gate', () => {
  let tempDir: string;
  let projectRoot: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-identity-gate-')));
    projectRoot = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(projectRoot, 'openspec', 'changes', 'archive'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, 'openspec', 'specs'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');

    env = {
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      HOME: tempDir,
      USERPROFILE: tempDir,
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY_USER: '',
    };
    delete process.env.OPENSPEC_TELEMETRY_USER;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('blocks non-bootstrap commands without identity', async () => {
    const result = await runCLI(['list', '--json'], { cwd: projectRoot, env });

    expect(result.exitCode).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain('telemetry_identity_required');
    expect(output).toContain('openspec init');
  });

  it('allows init to reach identity setup without preAction block', async () => {
    const result = await runCLI(['init', '--tools', 'none'], { cwd: projectRoot, env });

    expect(result.exitCode).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain('Telemetry identity required');
    expect(output).not.toContain('telemetry_identity_required');
  });

  it('allows commands when identity file exists', async () => {
    const identityDir = path.join(tempDir, 'config', 'openspec');
    fs.mkdirSync(identityDir, { recursive: true });
    fs.writeFileSync(
      path.join(identityDir, 'telemetry-identity.json'),
      JSON.stringify({ userId: 'dev@codewalla.com' }) + '\n'
    );

    const result = await runCLI(['list', '--json'], { cwd: projectRoot, env });

    expect(result.exitCode).toBe(0);
  });
});
