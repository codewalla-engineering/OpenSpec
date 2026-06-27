import type { ProjectConfig } from '../project-config.js';
import { resolveComprehensionConfig, type ComprehensionConfig } from './config.js';
import { fingerprintApplyArtifacts } from './fingerprint.js';
import {
  buildPassRecord,
  deleteSessionRecord,
  isPassValid,
  readPassRecord,
  writePassRecord,
  type ComprehensionPassRecord,
} from './pass-record.js';
import {
  computeSpecStats,
  OPTIONS_PER_QUESTION,
  type ArtifactPresence,
  type QuestionAllocation,
} from './stats.js';

export {
  DEFAULT_COMPREHENSION_CONFIG,
  resolveComprehensionConfig,
  type ComprehensionConfig,
} from './config.js';
export { fingerprintApplyArtifacts, fingerprintSpecFiles } from './fingerprint.js';
export {
  COMPREHENSION_PASS_FILENAME,
  COMPREHENSION_SESSION_FILENAME,
  buildPassRecord,
  deleteSessionRecord,
  isPassValid,
  readPassRecord,
  writePassRecord,
  type ComprehensionPassRecord,
} from './pass-record.js';
export {
  computeQuestionAllocation,
  computeQuestionCount,
  computeSpecStats,
  countSpecStats,
  OPTIONS_PER_QUESTION,
  type ArtifactPresence,
  type QuestionAllocation,
  type QuestionCategory,
  type SpecStats,
} from './stats.js';

export interface ComprehensionGateInfo {
  required: boolean;
  passed: boolean;
  thresholdPercent: number;
  bestScorePercent?: number;
  questionCount: number;
  questionAllocation: QuestionAllocation;
  optionsPerQuestion: number;
  requirementCount: number;
  scenarioCount: number;
  pendingTaskCount: number;
  attempts?: number;
}

export interface ComprehensionGateOptions {
  tasksPath?: string | null;
  planPath?: string | null;
  pendingTaskCount?: number;
  artifactPresence?: ArtifactPresence;
}

export interface ComprehensionGateResult {
  active: boolean;
  passed: boolean;
  info?: ComprehensionGateInfo;
}

/**
 * Evaluate whether apply is blocked by the comprehension gate.
 */
export function checkComprehensionGate(
  changeDir: string,
  specPaths: string[],
  projectConfig: ProjectConfig | null | undefined,
  gateOptions: ComprehensionGateOptions = {}
): ComprehensionGateResult {
  const config = resolveComprehensionConfig(projectConfig);
  const pendingTaskCount = gateOptions.pendingTaskCount ?? 0;
  const tasksPath = gateOptions.tasksPath ?? null;
  const planPath = gateOptions.planPath ?? null;
  const artifactPresence = gateOptions.artifactPresence ?? {};

  if (!config.enabled) {
    return { active: false, passed: true };
  }

  if (specPaths.length === 0) {
    return { active: false, passed: true };
  }

  const stats = computeSpecStats(specPaths, config, pendingTaskCount, artifactPresence);
  if (stats.requirementCount === 0) {
    return { active: false, passed: true };
  }

  const fingerprint = fingerprintApplyArtifacts({ specPaths, tasksPath, planPath });
  const record = readPassRecord(changeDir);
  const passed = isPassValid(record, fingerprint);

  const info: ComprehensionGateInfo = {
    required: true,
    passed,
    thresholdPercent: config.thresholdPercent,
    questionCount: stats.questionCount,
    questionAllocation: stats.questionAllocation,
    optionsPerQuestion: stats.optionsPerQuestion,
    requirementCount: stats.requirementCount,
    scenarioCount: stats.scenarioCount,
    pendingTaskCount: stats.pendingTaskCount,
    ...(record && !passed
      ? { bestScorePercent: record.score_percent, attempts: record.attempt }
      : record && passed
        ? { attempts: record.attempt }
        : {}),
  };

  return { active: true, passed, info };
}

export class ComprehensionPassError extends Error {
  constructor(
    message: string,
    public readonly score: number,
    public readonly threshold: number
  ) {
    super(message);
    this.name = 'ComprehensionPassError';
  }
}

/**
 * Record a comprehension pass after quiz success.
 */
export function recordComprehensionPass(input: {
  changeDir: string;
  specPaths: string[];
  tasksPath?: string | null;
  planPath?: string | null;
  projectConfig: ProjectConfig | null | undefined;
  scorePercent: number;
  attempt: number;
  questionCount: number;
  pendingTaskCount?: number;
  artifactPresence?: ArtifactPresence;
}): ComprehensionPassRecord {
  const config = resolveComprehensionConfig(input.projectConfig);

  if (input.scorePercent < config.thresholdPercent) {
    throw new ComprehensionPassError(
      `Score ${input.scorePercent}% is below the ${config.thresholdPercent}% threshold required to apply.`,
      input.scorePercent,
      config.thresholdPercent
    );
  }

  const stats =
    input.questionCount > 0
      ? { questionCount: input.questionCount }
      : computeSpecStats(
          input.specPaths,
          config,
          input.pendingTaskCount ?? 0,
          input.artifactPresence ?? {}
        );

  const fingerprint = fingerprintApplyArtifacts({
    specPaths: input.specPaths,
    tasksPath: input.tasksPath,
    planPath: input.planPath,
  });
  const record = buildPassRecord({
    scorePercent: input.scorePercent,
    thresholdPercent: config.thresholdPercent,
    attempt: input.attempt,
    questionCount: stats.questionCount,
    specFingerprint: fingerprint,
  });

  writePassRecord(input.changeDir, record);
  deleteSessionRecord(input.changeDir);
  return record;
}

export { OPTIONS_PER_QUESTION as comprehensionOptionsPerQuestion };
