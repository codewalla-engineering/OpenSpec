import { readFileSync } from 'node:fs';
import { parseDeltaSpec } from '../parsers/requirement-blocks.js';
import type { ComprehensionConfig } from './config.js';

const SCENARIO_HEADER_REGEX = /^####\s*Scenario:/gim;

export const OPTIONS_PER_QUESTION = 3;

export type QuestionCategory = 'plan' | 'specs' | 'design' | 'proposal' | 'tasks';

export type QuestionAllocation = Partial<Record<QuestionCategory, number>>;

export interface ArtifactPresence {
  hasPlan?: boolean;
  hasProposal?: boolean;
  hasDesign?: boolean;
  hasSpecs?: boolean;
  hasTasks?: boolean;
}

export interface SpecStats {
  requirementCount: number;
  scenarioCount: number;
  pendingTaskCount: number;
  questionCount: number;
  questionAllocation: QuestionAllocation;
  optionsPerQuestion: number;
}

const NON_PLAN_PRIORITY: QuestionCategory[] = ['specs', 'design', 'proposal', 'tasks'];

function isCategoryPresent(category: QuestionCategory, presence: ArtifactPresence): boolean {
  switch (category) {
    case 'plan':
      return presence.hasPlan === true;
    case 'specs':
      return presence.hasSpecs === true;
    case 'design':
      return presence.hasDesign === true;
    case 'proposal':
      return presence.hasProposal === true;
    case 'tasks':
      return presence.hasTasks === true;
    default:
      return false;
  }
}

function sumAllocation(allocation: QuestionAllocation): number {
  return Object.values(allocation).reduce((sum, n) => sum + (n ?? 0), 0);
}

/**
 * Distribute quiz questions across artifact categories.
 * When plan exists, plan receives ceil(total/2) — strictly more than any other category.
 */
export function computeQuestionAllocation(
  total: number,
  presence: ArtifactPresence
): QuestionAllocation {
  if (total <= 0) {
    return {};
  }

  if (presence.hasPlan) {
    const allocation: QuestionAllocation = {};
    const planQuota = Math.ceil(total / 2);
    allocation.plan = planQuota;
    let remainder = total - planQuota;

    for (const category of NON_PLAN_PRIORITY) {
      if (remainder <= 0) {
        break;
      }
      if (!isCategoryPresent(category, presence)) {
        continue;
      }
      allocation[category] = (allocation[category] ?? 0) + 1;
      remainder--;
    }

    const presentOthers = NON_PLAN_PRIORITY.filter((category) =>
      isCategoryPresent(category, presence)
    );
    let index = 0;
    while (remainder > 0 && presentOthers.length > 0) {
      const category = presentOthers[index % presentOthers.length];
      allocation[category] = (allocation[category] ?? 0) + 1;
      remainder--;
      index++;
    }

    return allocation;
  }

  return computeQuestionAllocationEven(total, presence);
}

/**
 * Even split when plan is absent: at least one per present category, extras specs-first.
 */
function computeQuestionAllocationEven(
  total: number,
  presence: ArtifactPresence
): QuestionAllocation {
  const present: QuestionCategory[] = NON_PLAN_PRIORITY.filter((category) =>
    isCategoryPresent(category, presence)
  );

  if (present.length === 0) {
    return {};
  }

  const allocation: QuestionAllocation = {};
  let assigned = 0;

  for (const category of present) {
    if (assigned >= total) {
      break;
    }
    allocation[category] = 1;
    assigned++;
  }

  let remainder = total - assigned;
  let index = 0;
  while (remainder > 0) {
    const category = present[index % present.length];
    allocation[category] = (allocation[category] ?? 0) + 1;
    remainder--;
    index++;
  }

  return allocation;
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
  pendingTaskCount = 0,
  presence: ArtifactPresence = {}
): SpecStats {
  const { requirementCount, scenarioCount } = countSpecStats(specPaths);
  const questionCount = computeQuestionCount(
    requirementCount,
    scenarioCount,
    pendingTaskCount,
    config
  );
  const questionAllocation = computeQuestionAllocation(questionCount, presence);
  const allocationTotal = sumAllocation(questionAllocation);

  return {
    requirementCount,
    scenarioCount,
    pendingTaskCount,
    questionCount: allocationTotal > 0 ? allocationTotal : questionCount,
    questionAllocation,
    optionsPerQuestion: OPTIONS_PER_QUESTION,
  };
}
