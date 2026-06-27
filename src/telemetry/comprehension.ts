/**
 * Comprehension gate and attempt telemetry.
 */
import type { ComprehensionGateInfo } from '../core/comprehension/index.js';
import { captureEvent } from './client.js';
import {
  collectArtifactBodiesMap,
  collectArtifactPathsMap,
} from './content.js';
import { durationSince, readMarker, updateMarker } from './marker.js';

export interface MarkerEnrichment {
  editor?: string;
  entry_point?: string;
  workflow_input?: string;
  duration_since_start_ms?: number;
}

export async function enrichFromMarker(
  changeDir: string,
  props: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const marker = await readMarker(changeDir);
  return {
    ...props,
    ...(marker.editor ? { editor: marker.editor } : {}),
    ...(marker.entry_point ? { entry_point: marker.entry_point } : {}),
    ...(marker.workflow_input ? { workflow_input: marker.workflow_input } : {}),
    duration_since_start_ms: durationSince(marker.started_at),
  };
}

export async function incrementComprehensionAttempt(
  changeDir: string
): Promise<{ attempt: number; failureCountBefore: number }> {
  const before = await readMarker(changeDir);
  const failureCountBefore = before.comprehension_failure_count ?? 0;
  const marker = await updateMarker(changeDir, (current) => ({
    ...current,
    comprehension_attempt_count: (current.comprehension_attempt_count ?? 0) + 1,
  }));
  return {
    attempt: marker.comprehension_attempt_count ?? 1,
    failureCountBefore,
  };
}

export async function incrementComprehensionFailureCount(changeDir: string): Promise<number> {
  const marker = await updateMarker(changeDir, (current) => ({
    ...current,
    comprehension_failure_count: (current.comprehension_failure_count ?? 0) + 1,
  }));
  return marker.comprehension_failure_count ?? 1;
}

export async function trackComprehensionAttempt(params: {
  changeDir: string;
  changeName: string;
  attempt: number;
  scorePercent: number;
  thresholdPercent: number;
  questionCount: number;
  passed: boolean;
  failureCountBefore: number;
  nextMilestone?: 'apply_ready';
  contextFiles: Record<string, string[]>;
}): Promise<void> {
  const artifactPaths = await collectArtifactPathsMap(params.changeDir, params.contextFiles);
  const artifactBodies = await collectArtifactBodiesMap(params.changeDir, params.contextFiles);
  const result = params.passed ? 'passed' : 'failed';

  const baseProps = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    attempt: params.attempt,
    score_percent: params.scorePercent,
    threshold_percent: params.thresholdPercent,
    question_count: params.questionCount,
    passed: params.passed,
    result,
    failure_count: params.failureCountBefore,
    ...(params.passed ? {} : { gap_to_pass: params.thresholdPercent - params.scorePercent }),
    ...(params.nextMilestone ? { next_milestone: params.nextMilestone } : {}),
    ...(Object.keys(artifactPaths).length > 0 ? { artifact_paths: artifactPaths } : {}),
    ...(Object.keys(artifactBodies).length > 0 ? { artifact_bodies: artifactBodies } : {}),
  });

  if (params.passed) {
    await captureEvent('comprehension_attempt', baseProps, {
      $set: {
        comprehension_last_pass_attempt: params.attempt,
        comprehension_last_pass_failures_before: params.failureCountBefore,
      },
    });
    return;
  }

  await captureEvent('comprehension_attempt', baseProps, {
    $increment: { comprehension_failures_total: 1 },
  });
}

export function shouldEmitComprehensionGateChecked(
  marker: Awaited<ReturnType<typeof readMarker>>,
  passed: boolean,
  bestScorePercent?: number
): boolean {
  const last = marker.comprehension_gate_last_emitted;
  if (!last) {
    return true;
  }
  return last.passed !== passed || last.best_score_percent !== bestScorePercent;
}

export async function trackComprehensionGateChecked(params: {
  changeDir: string;
  changeName: string;
  passed: boolean;
  gateInfo: ComprehensionGateInfo;
  state: 'blocked' | 'ready';
  contextFiles: Record<string, string[]>;
}): Promise<void> {
  const marker = await readMarker(params.changeDir);
  if (
    !shouldEmitComprehensionGateChecked(
      marker,
      params.passed,
      params.gateInfo.bestScorePercent
    )
  ) {
    return;
  }

  await updateMarker(params.changeDir, (current) => ({
    ...current,
    comprehension_gate_last_emitted: {
      passed: params.passed,
      best_score_percent: params.gateInfo.bestScorePercent,
    },
  }));

  const artifactPaths = await collectArtifactPathsMap(params.changeDir, params.contextFiles);
  const props = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    required: true,
    passed: params.passed,
    threshold_percent: params.gateInfo.thresholdPercent,
    question_count: params.gateInfo.questionCount,
    best_score_percent: params.gateInfo.bestScorePercent,
    attempts: params.gateInfo.attempts,
    state: params.state,
    ...(Object.keys(artifactPaths).length > 0 ? { artifact_paths: artifactPaths } : {}),
  });

  await captureEvent('comprehension_gate_checked', props);
}

export async function trackComprehensionRetakeRequired(params: {
  changeDir: string;
  changeName: string;
  gateInfo: ComprehensionGateInfo;
}): Promise<void> {
  const props = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    best_score_percent: params.gateInfo.bestScorePercent,
    threshold_percent: params.gateInfo.thresholdPercent,
  });
  await captureEvent('comprehension_retake_required', props);
}
