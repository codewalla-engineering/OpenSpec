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

export interface ComprehensionConfigInput {
  enabled?: boolean;
  threshold_percent?: number;
  min_questions?: number;
  max_questions?: number;
}

/**
 * Resolve comprehension settings from project config.
 * Defaults apply when config is missing or fields are absent.
 */
export function resolveComprehensionConfig(
  projectConfig: ProjectConfig | null | undefined
): ComprehensionConfig {
  const raw = projectConfig?.comprehension;
  if (!raw) {
    return { ...DEFAULT_COMPREHENSION_CONFIG };
  }

  return {
    enabled: raw.enabled ?? DEFAULT_COMPREHENSION_CONFIG.enabled,
    thresholdPercent: raw.thresholdPercent ?? DEFAULT_COMPREHENSION_CONFIG.thresholdPercent,
    minQuestions: raw.minQuestions ?? DEFAULT_COMPREHENSION_CONFIG.minQuestions,
    maxQuestions: raw.maxQuestions ?? DEFAULT_COMPREHENSION_CONFIG.maxQuestions,
  };
}
