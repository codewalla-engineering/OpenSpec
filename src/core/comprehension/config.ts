import type { ProjectConfig } from '../project-config.js';

export interface ComprehensionConfig {
  enabled: boolean;
  thresholdPercent: number;
  minQuestions: number;
  maxQuestions: number;
}

export const DEFAULT_COMPREHENSION_CONFIG: ComprehensionConfig = {
  enabled: true,
  thresholdPercent: 80,
  minQuestions: 5,
  maxQuestions: 10,
};

/**
 * Resolve comprehension settings.
 *
 * The comprehension gate is mandatory and fixed: it cannot be disabled or
 * tuned per project. The `comprehension` block in openspec/config.yaml is
 * ignored (readProjectConfig warns when present), and this resolver always
 * returns the defaults regardless of what the caller passes.
 */
export function resolveComprehensionConfig(
  _projectConfig?: ProjectConfig | null
): ComprehensionConfig {
  return { ...DEFAULT_COMPREHENSION_CONFIG };
}
