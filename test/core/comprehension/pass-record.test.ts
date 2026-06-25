import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildPassRecord,
  fingerprintSpecFiles,
  isPassValid,
  readPassRecord,
  writePassRecord,
  checkComprehensionGate,
  recordComprehensionPass,
  ComprehensionPassError,
} from '../../../src/core/comprehension/index.js';

const DELTA_SPEC = `## ADDED Requirements

### Requirement: Feature A
The system SHALL do A.

#### Scenario: A works
- **WHEN** user triggers A
- **THEN** A happens
`;

describe('comprehension pass record', () => {
  let dir: string;
  let specPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'comp-pass-'));
    specPath = join(dir, 'feature.md');
    await writeFile(specPath, DELTA_SPEC);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('fingerprints spec files deterministically', () => {
    const fp1 = fingerprintSpecFiles([specPath]);
    const fp2 = fingerprintSpecFiles([specPath]);
    expect(fp1).toBe(fp2);
  });

  it('invalidates pass when spec content changes', async () => {
    const fp = fingerprintSpecFiles([specPath]);
    const record = buildPassRecord({
      scorePercent: 90,
      thresholdPercent: 80,
      attempt: 1,
      questionCount: 5,
      specFingerprint: fp,
    });
    writePassRecord(dir, record);

    expect(isPassValid(readPassRecord(dir), fp)).toBe(true);

    await writeFile(specPath, DELTA_SPEC + '\n# edited\n');
    const newFp = fingerprintSpecFiles([specPath]);
    expect(isPassValid(readPassRecord(dir), newFp)).toBe(false);
  });

  it('checkComprehensionGate blocks without pass', () => {
    const gate = checkComprehensionGate(dir, [specPath], null);
    expect(gate.active).toBe(true);
    expect(gate.passed).toBe(false);
    expect(gate.info?.questionCount).toBeGreaterThanOrEqual(5);
  });

  it('checkComprehensionGate passes after valid record', () => {
    recordComprehensionPass({
      changeDir: dir,
      specPaths: [specPath],
      projectConfig: null,
      scorePercent: 85,
      attempt: 1,
      questionCount: 5,
    });

    const gate = checkComprehensionGate(dir, [specPath], null);
    expect(gate.active).toBe(true);
    expect(gate.passed).toBe(true);
  });

  it('recordComprehensionPass rejects score below threshold', () => {
    expect(() =>
      recordComprehensionPass({
        changeDir: dir,
        specPaths: [specPath],
        projectConfig: null,
        scorePercent: 60,
        attempt: 1,
        questionCount: 5,
      })
    ).toThrow(ComprehensionPassError);
  });

  it('checkComprehensionGate skipped when disabled', () => {
    const gate = checkComprehensionGate(dir, [specPath], {
      schema: 'spec-driven',
      comprehension: { enabled: false },
    });
    expect(gate.active).toBe(false);
    expect(gate.passed).toBe(true);
  });
});
