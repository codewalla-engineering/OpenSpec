/**
 * Workflow lifecycle telemetry — propose → archive funnel and artifact revisions.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { captureGitHead } from './git-stats.js';
import {
  type ChangeTelemetryMarker,
  type EntryPoint,
  durationBetween,
  durationSince,
  hashFileAt,
  readMarker,
  totalRevisions,
  updateMarker,
} from './marker.js';
import { captureEvent } from './client.js';
import { sanitizeWorkflowInput } from './input.js';

const TRACKED_ARTIFACT_IDS = ['proposal', 'design', 'plan', 'tasks', 'specs'] as const;

export async function trackWorkflowStarted(params: {
  changeDir: string;
  changeName: string;
  schema: string;
  entryPoint: EntryPoint;
  storeSelected: boolean;
  projectRoot: string;
  workflowInput?: string;
  description?: string;
  goal?: string;
  editor?: string;
}): Promise<void> {
  const gitHead = await captureGitHead(params.projectRoot);
  const startedAt = new Date().toISOString();
  const workflowInput = params.workflowInput
    ? sanitizeWorkflowInput(params.workflowInput)
    : undefined;
  const description = params.description
    ? sanitizeWorkflowInput(params.description)
    : undefined;
  const goal = params.goal ? sanitizeWorkflowInput(params.goal) : undefined;

  await updateMarker(params.changeDir, (current) => ({
    ...current,
    started_at: startedAt,
    entry_point: params.entryPoint,
    ...(workflowInput ? { workflow_input: workflowInput } : {}),
    ...(params.editor ? { editor: params.editor } : {}),
    ...(gitHead ? { git_head_at_start: gitHead } : {}),
  }));

  await captureEvent('workflow_started', {
    change_name: params.changeName,
    schema: params.schema,
    entry_point: params.entryPoint,
    store_selected: params.storeSelected,
    ...(workflowInput ? { workflow_input: workflowInput } : {}),
    ...(description ? { description } : {}),
    ...(goal ? { goal } : {}),
    ...(params.editor ? { editor: params.editor } : {}),
  });
}

export async function maybeEmitProposalReady(params: {
  changeDir: string;
  changeName: string;
  schema: string;
  missingArtifacts: string[];
  artifactCount: number;
}): Promise<void> {
  if (params.missingArtifacts.length > 0) {
    return;
  }

  const marker = await readMarker(params.changeDir);
  if (marker.proposal_ready_emitted) {
    return;
  }

  const proposalReadyAt = new Date().toISOString();
  await updateMarker(params.changeDir, (current) => ({
    ...current,
    proposal_ready_at: proposalReadyAt,
    proposal_ready_emitted: true,
  }));

  await captureEvent('change_proposal_ready', {
    change_name: params.changeName,
    schema: params.schema,
    artifact_count: params.artifactCount,
    duration_since_start_ms: durationSince(marker.started_at),
  });
}

export async function maybeEmitApplyReady(params: {
  changeDir: string;
  changeName: string;
  state: string;
}): Promise<void> {
  if (params.state !== 'ready') {
    return;
  }

  const marker = await readMarker(params.changeDir);
  if (marker.apply_ready_emitted) {
    return;
  }

  await updateMarker(params.changeDir, (current) => ({
    ...current,
    apply_ready_emitted: true,
  }));

  await captureEvent('apply_ready', {
    change_name: params.changeName,
    duration_since_start_ms: durationSince(marker.started_at),
  });
}

export async function trackArtifactInstructions(params: {
  changeDir: string;
  changeName: string;
  artifactId: string;
  artifactWasDone: boolean;
}): Promise<void> {
  await captureEvent('artifact_instructions_requested', {
    change_name: params.changeName,
    artifact_id: params.artifactId,
  });

  if (!params.artifactWasDone) {
    return;
  }

  const marker = await updateMarker(params.changeDir, (current) => {
    const revisionCounts = { ...(current.revision_counts ?? {}) };
    const next = (revisionCounts[params.artifactId] ?? 0) + 1;
    revisionCounts[params.artifactId] = next;
    return { ...current, revision_counts: revisionCounts };
  });

  const revisionNumber = marker.revision_counts?.[params.artifactId] ?? 1;

  await captureEvent('artifact_revision_requested', {
    change_name: params.changeName,
    artifact_id: params.artifactId,
    revision_number: revisionNumber,
  });
}

async function hashArtifactFiles(
  changeDir: string,
  contextFiles: Record<string, string[]>
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};

  for (const artifactId of TRACKED_ARTIFACT_IDS) {
    const paths = contextFiles[artifactId];
    if (!paths?.length) {
      continue;
    }

    const parts: string[] = [];
    for (const filePath of paths) {
      const hash = await hashFileAt(filePath);
      if (hash) {
        parts.push(hash);
      }
    }
    if (parts.length > 0) {
      hashes[artifactId] = parts.join(':');
    }
  }

  return hashes;
}

export async function trackArtifactContentChanges(params: {
  changeDir: string;
  changeName: string;
  contextFiles: Record<string, string[]>;
}): Promise<void> {
  const currentHashes = await hashArtifactFiles(params.changeDir, params.contextFiles);
  if (Object.keys(currentHashes).length === 0) {
    return;
  }

  const marker = await readMarker(params.changeDir);
  const previousHashes = marker.artifact_hashes ?? {};

  for (const [artifactId, hash] of Object.entries(currentHashes)) {
    const previous = previousHashes[artifactId];
    if (previous && previous !== hash) {
      const updated = await updateMarker(params.changeDir, (current) => {
        const revisionCounts = { ...(current.revision_counts ?? {}) };
        revisionCounts[artifactId] = (revisionCounts[artifactId] ?? 0) + 1;
        return { ...current, revision_counts: revisionCounts };
      });

      await captureEvent('artifact_content_changed', {
        change_name: params.changeName,
        artifact_id: artifactId,
        change_count: updated.revision_counts?.[artifactId] ?? 1,
      });
    }
  }

  await updateMarker(params.changeDir, (current) => ({
    ...current,
    artifact_hashes: { ...(current.artifact_hashes ?? {}), ...currentHashes },
  }));
}

export async function trackComprehensionRetakeRequired(changeName: string): Promise<void> {
  await captureEvent('comprehension_retake_required', {
    change_name: changeName,
  });
}

interface SpecDeltaInfo {
  capability: string;
  counts: { added: number; modified: number; removed: number; renamed: number };
  deltaSpecLinesChanged?: number;
}

async function countDeltaSpecLines(filePath: string): Promise<number | undefined> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return undefined;
  }
}

export async function trackChangeArchived(params: {
  changeDir: string;
  changeName: string;
  schema: string;
  specsUpdated: boolean;
  totals?: { added: number; modified: number; removed: number; renamed: number };
  tasksComplete: boolean;
  specDeltas: SpecDeltaInfo[];
  projectRoot: string;
}): Promise<void> {
  const marker = await readMarker(params.changeDir);
  const now = new Date().toISOString();

  for (const delta of params.specDeltas) {
    await captureEvent('spec_delta_applied', {
      change_name: params.changeName,
      capability: delta.capability,
      requirements_added: delta.counts.added,
      requirements_modified: delta.counts.modified,
      requirements_removed: delta.counts.removed,
      requirements_renamed: delta.counts.renamed,
    });

    if (delta.deltaSpecLinesChanged !== undefined) {
      await captureEvent('spec_delta_lines_changed', {
        change_name: params.changeName,
        capability: delta.capability,
        lines_added: delta.deltaSpecLinesChanged,
        lines_removed: 0,
      });
    }
  }

  let implementation: GitDiffStatsPayload | undefined;
  if (marker.git_head_at_start) {
    const { diffStatsSince } = await import('./git-stats.js');
    const stats = await diffStatsSince(marker.git_head_at_start, params.projectRoot);
    if (stats) {
      implementation = stats;
      await captureEvent('implementation_changed', {
        change_name: params.changeName,
        files_changed: stats.files_changed,
        lines_added: stats.lines_added,
        lines_removed: stats.lines_removed,
        lines_changed: stats.lines_changed,
        spec_capabilities_count: params.specDeltas.length,
      });
    }
  }

  const specsSummary = params.specDeltas.map((d) => ({
    capability: d.capability,
    requirements_added: d.counts.added,
    requirements_modified: d.counts.modified,
    requirements_removed: d.counts.removed,
    requirements_renamed: d.counts.renamed,
    delta_spec_lines_changed: d.deltaSpecLinesChanged,
  }));

  await captureEvent('change_archived', {
    change_name: params.changeName,
    schema: params.schema,
    specs_updated: params.specsUpdated,
    tasks_complete: params.tasksComplete,
    entry_point: marker.entry_point ?? 'manual',
    ...(marker.workflow_input ? { workflow_input: marker.workflow_input } : {}),
    ...(marker.editor ? { editor: marker.editor } : {}),
    duration_since_start_ms: durationSince(marker.started_at),
    duration_proposal_to_ready_ms: durationBetween(marker.started_at, marker.proposal_ready_at),
    duration_ready_to_archive_ms: durationBetween(marker.proposal_ready_at, now),
    total_revisions: totalRevisions(marker),
    revision_counts: marker.revision_counts ?? {},
    specs: specsSummary,
    ...(implementation ? { implementation } : {}),
    ...(params.totals
      ? {
          requirements_added: params.totals.added,
          requirements_modified: params.totals.modified,
          requirements_removed: params.totals.removed,
          requirements_renamed: params.totals.renamed,
        }
      : {}),
  });
}

type GitDiffStatsPayload = {
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  lines_changed: number;
};

export async function buildSpecDeltasFromUpdates(
  specUpdates: Array<{
    source: string;
    counts: { added: number; modified: number; removed: number; renamed: number };
  }>
): Promise<SpecDeltaInfo[]> {
  const deltas: SpecDeltaInfo[] = [];
  for (const update of specUpdates) {
    const capability = path.basename(path.dirname(update.source));
    const deltaSpecLinesChanged = await countDeltaSpecLines(update.source);
    deltas.push({
      capability,
      counts: update.counts,
      deltaSpecLinesChanged,
    });
  }
  return deltas;
}

export type { ChangeTelemetryMarker, EntryPoint };
