import { readFileSync } from 'node:fs';

const REQUIRED_SECTIONS = [
  'Code Map',
  'Implementation Order',
  'Test Plan',
  'Risks',
  'Done Definition',
] as const;

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

/**
 * Validate that plan.md contains the required section headings.
 */
export function validatePlan(planPath: string): PlanValidationResult {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const content = readFileSync(planPath, 'utf-8');
    const lines = content.split('\n');

    for (const section of REQUIRED_SECTIONS) {
      const sectionPattern = new RegExp(`^##\\s+${section}`, 'i');
      const hasSection = lines.some((line) => sectionPattern.test(line.trim()));

      if (!hasSection) {
        errors.push(`Missing required section: "${section}"`);
      }
    }

    const duration = performance.now() - startTime;
    if (duration > 2000) {
      warnings.push(`Validation took ${duration.toFixed(0)}ms (exceeds 2 second limit)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      duration,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Failed to read plan file: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings: [],
      duration: performance.now() - startTime,
    };
  }
}
