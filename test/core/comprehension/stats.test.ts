import { describe, expect, it } from 'vitest';
import {
  computeQuestionAllocation,
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

describe('computeQuestionAllocation', () => {
  const allPresent = {
    hasPlan: true,
    hasProposal: true,
    hasDesign: true,
    hasSpecs: true,
    hasTasks: true,
  };

  it('gives plan a strict majority when plan exists', () => {
    for (const total of [5, 7, 8, 10]) {
      const allocation = computeQuestionAllocation(total, allPresent);
      const planCount = allocation.plan ?? 0;
      const others = Object.entries(allocation)
        .filter(([key]) => key !== 'plan')
        .map(([, count]) => count ?? 0);
      expect(planCount).toBe(Math.ceil(total / 2));
      expect(Math.max(...others, 0)).toBeLessThan(planCount);
      expect(Object.values(allocation).reduce((sum, n) => sum + (n ?? 0), 0)).toBe(total);
    }
  });

  it('matches documented allocation table for all-five present', () => {
    expect(computeQuestionAllocation(5, allPresent)).toEqual({
      plan: 3,
      specs: 1,
      design: 1,
    });
    expect(computeQuestionAllocation(7, allPresent)).toEqual({
      plan: 4,
      specs: 1,
      design: 1,
      proposal: 1,
    });
    expect(computeQuestionAllocation(8, allPresent)).toEqual({
      plan: 4,
      specs: 1,
      design: 1,
      proposal: 1,
      tasks: 1,
    });
    expect(computeQuestionAllocation(10, allPresent)).toEqual({
      plan: 5,
      specs: 2,
      design: 1,
      proposal: 1,
      tasks: 1,
    });
  });

  it('falls back to even split when plan is absent', () => {
    const allocation = computeQuestionAllocation(5, {
      hasProposal: true,
      hasDesign: true,
      hasSpecs: true,
      hasTasks: true,
    });
    expect(allocation.plan).toBeUndefined();
    expect(Object.values(allocation).reduce((sum, n) => sum + (n ?? 0), 0)).toBe(5);
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

    const stats = computeSpecStats([specPath], DEFAULT_COMPREHENSION_CONFIG, 0, {
      hasPlan: true,
      hasProposal: true,
      hasDesign: true,
      hasSpecs: true,
    });
    expect(stats.requirementCount).toBe(2);
    expect(stats.scenarioCount).toBe(3);
    expect(stats.questionCount).toBeGreaterThanOrEqual(5);
    expect(stats.questionCount).toBeLessThanOrEqual(10);
    expect(stats.optionsPerQuestion).toBe(3);
    expect(stats.questionAllocation.plan).toBeGreaterThan(0);

    await rm(dir, { recursive: true, force: true });
  });
});
