import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validatePlan } from '../../../src/core/validation/plan-validator.js';

describe('validatePlan', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'openspec-plan-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts a plan with all required sections', () => {
    const planPath = join(dir, 'plan.md');
    writeFileSync(
      planPath,
      [
        '## Code Map',
        '- a.ts',
        '## Implementation Order',
        '1. Do thing',
        '## Test Plan',
        '- unit tests',
        '## Risks',
        '- none',
        '## Done Definition',
        '- shipped',
        '',
      ].join('\n')
    );

    const result = validatePlan(planPath);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports missing sections', () => {
    const planPath = join(dir, 'plan.md');
    writeFileSync(planPath, '## Code Map\n\n- a.ts\n');

    const result = validatePlan(planPath);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Missing required section: "Implementation Order"',
        'Missing required section: "Test Plan"',
        'Missing required section: "Risks"',
        'Missing required section: "Done Definition"',
      ])
    );
  });
});
