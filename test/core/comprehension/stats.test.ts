import { describe, expect, it } from 'vitest';
import {
  computeQuestionCount,
  computeSpecStats,
} from '../../../src/core/comprehension/stats.js';
import { DEFAULT_COMPREHENSION_CONFIG } from '../../../src/core/comprehension/config.js';

const DELTA_SPEC = `## ADDED Requirements

### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.

#### Scenario: Successful export
- **WHEN** user clicks Export
- **THEN** system downloads a CSV file

#### Scenario: Empty dataset
- **WHEN** user has no rows
- **THEN** system downloads an empty CSV file

### Requirement: Export is audited
The system SHALL log every export action.

#### Scenario: Audit log written
- **WHEN** export completes
- **THEN** an audit entry is created
`;

describe('comprehension stats', () => {
  it('clamps question count between min and max', () => {
    expect(
      computeQuestionCount(1, 1, 0, {
        minQuestions: 5,
        maxQuestions: 10,
      })
    ).toBe(5);
    expect(
      computeQuestionCount(20, 30, 0, {
        minQuestions: 5,
        maxQuestions: 10,
      })
    ).toBe(10);
    expect(
      computeQuestionCount(8, 12, 0, {
        minQuestions: 5,
        maxQuestions: 10,
      })
    ).toBe(7);
    expect(
      computeQuestionCount(1, 1, 10, {
        minQuestions: 5,
        maxQuestions: 10,
      })
    ).toBe(5);
  });
});

describe('computeSpecStats from files', () => {
  it('computes stats from spec file paths', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'comp-stats-'));
    const specPath = join(dir, 'auth.md');
    await writeFile(specPath, DELTA_SPEC);

    const stats = computeSpecStats([specPath], DEFAULT_COMPREHENSION_CONFIG);
    expect(stats.requirementCount).toBe(2);
    expect(stats.scenarioCount).toBe(3);
    expect(stats.questionCount).toBeGreaterThanOrEqual(5);
    expect(stats.questionCount).toBeLessThanOrEqual(10);

    await rm(dir, { recursive: true, force: true });
  });
});
