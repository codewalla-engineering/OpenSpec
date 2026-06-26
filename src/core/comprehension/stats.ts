import { readFileSync } from 'node:fs';
import { parseDeltaSpec } from '../parsers/requirement-blocks.js';
import type { ComprehensionConfig } from './config.js';

const SCENARIO_HEADER_REGEX = /^####\s*Scenario:/gim;

export interface SpecStats {
  requirementCount: number;
  scenarioCount: number;
  pendingTaskCount: number;
  questionCount: number;
}

function countScenariosInBlock(raw: string): number {
  const matches = raw.match(SCENARIO_HEADER_REGEX);
  return matches?.length ?? 0;
}

/**
 * Count requirements and scenarios across delta spec files.
 */
export function countSpecStats(specPaths: string[]): Pick<SpecStats, 'requirementCount' | 'scenarioCount'> {
  let requirementCount = 0;
  let scenarioCount = 0;

  for (const specPath of specPaths) {
    const content = readFileSync(specPath, 'utf-8');
    const plan = parseDeltaSpec(content);
    const blocks = [...plan.added, ...plan.modified];
    requirementCount += blocks.length;
    for (const block of blocks) {
      scenarioCount += countScenariosInBlock(block.raw);
    }
  }

  return { requirementCount, scenarioCount };
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Target quiz length from spec and task size:
 * clamp(min, max, round(req * 0.6 + scenarios * 0.15 + pendingTasks * 0.15)).
 */
export function computeQuestionCount(
  requirementCount: number,
  scenarioCount: number,
  pendingTaskCount: number,
  config: Pick<ComprehensionConfig, 'minQuestions' | 'maxQuestions'>
): number {
  const raw = Math.round(
    requirementCount * 0.6 + scenarioCount * 0.15 + pendingTaskCount * 0.15
  );
  return clamp(config.minQuestions, config.maxQuestions, raw);
}

export function computeSpecStats(
  specPaths: string[],
  config: Pick<ComprehensionConfig, 'minQuestions' | 'maxQuestions'>,
  pendingTaskCount = 0
): SpecStats {
  const { requirementCount, scenarioCount } = countSpecStats(specPaths);
  const questionCount = computeQuestionCount(
    requirementCount,
    scenarioCount,
    pendingTaskCount,
    config
  );
  return { requirementCount, scenarioCount, pendingTaskCount, questionCount };
}
