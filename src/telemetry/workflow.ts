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
  hashFileContent,
  readMarker,
  totalRevisions,
  updateMarker,
} from './marker.js';
import { captureEvent } from './client.js';
import { enrichFromMarker } from './comprehension.js';
import {
  collectArtifactPathsMap,
  readPrimaryArtifactBody,
  readSanitizedFileAt,
  toChangeRelativePaths,
} from './content.js';
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

async function buildArtifactPathsSummary(
  changeDir: string,
  contextFiles: Record<string, string[]>
): Promise<Record<string, string[]> | undefined> {
  const paths = await collectArtifactPathsMap(changeDir, contextFiles);
  return Object.keys(paths).length > 0 ? paths : undefined;
}

export async function maybeEmitProposalReady(params: {
  changeDir: string;
  changeName: string;
  schema: string;
  missingArtifacts: string[];
  artifactCount: number;
  contextFiles?: Record<string, string[]>;
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

  const artifactPaths = params.contextFiles
    ? await buildArtifactPathsSummary(params.changeDir, params.contextFiles)
    : undefined;

  const props = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    schema: params.schema,
    artifact_count: params.artifactCount,
    duration_since_start_ms: durationSince(marker.started_at),
    ...(artifactPaths ? { artifact_paths: artifactPaths } : {}),
  });

  await captureEvent('change_proposal_ready', props);
}

export async function maybeEmitApplyReady(params: {
  changeDir: string;
  changeName: string;
  state: string;
  contextFiles?: Record<string, string[]>;
}): Promise<boolean> {
  if (params.state !== 'ready') {
    return false;
  }

  const marker = await readMarker(params.changeDir);
  if (marker.apply_ready_emitted) {
    return false;
  }

  await updateMarker(params.changeDir, (current) => ({
    ...current,
    apply_ready_emitted: true,
  }));

  const artifactPaths = params.contextFiles
    ? await buildArtifactPathsSummary(params.changeDir, params.contextFiles)
    : undefined;

  const props = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    duration_since_start_ms: durationSince(marker.started_at),
    ...(artifactPaths ? { artifact_paths: artifactPaths } : {}),
  });

  await captureEvent('apply_ready', props);
  return true;
}

export async function trackArtifactInstructions(params: {
  changeDir: string;
  changeName: string;
  artifactId: string;
  artifactWasDone: boolean;
  artifactPaths?: string[];
}): Promise<void> {
  const relativePaths =
    params.artifactPaths && params.artifactPaths.length > 0
      ? toChangeRelativePaths(params.changeDir, params.artifactPaths)
      : undefined;
  const artifactBody =
    params.artifactPaths && params.artifactPaths.length > 0
      ? await readPrimaryArtifactBody(params.changeDir, params.artifactPaths)
      : undefined;

  const props = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    artifact_id: params.artifactId,
    artifact_was_done: params.artifactWasDone,
    ...(relativePaths ? { artifact_paths: relativePaths } : {}),
    ...(artifactBody ? { artifact_body: artifactBody } : {}),
  });

  await captureEvent('artifact_instructions_requested', props);

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
  const revisionProps = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    artifact_id: params.artifactId,
    revision_number: revisionNumber,
  });

  await captureEvent('artifact_revision_requested', revisionProps);
}

export async function trackArtifactModifyRequested(params: {
  changeDir: string;
  changeName: string;
  schema: string;
  sourceArtifactId: string;
  downstreamArtifactIds: string[];
  artifactsToUpdate: string[];
  modifyInput?: string;
  editor?: string;
}): Promise<void> {
  const modifyInput = params.modifyInput
    ? sanitizeWorkflowInput(params.modifyInput)
    : undefined;
  const now = new Date().toISOString();

  await updateMarker(params.changeDir, (current) => ({
    ...current,
    modify_history: [
      ...(current.modify_history ?? []),
      {
        at: now,
        source_artifact: params.sourceArtifactId,
        ...(modifyInput ? { modify_input: modifyInput } : {}),
      },
    ],
  }));

  const props = await enrichFromMarker(params.changeDir, {
    change_name: params.changeName,
    schema: params.schema,
    source_artifact_id: params.sourceArtifactId,
    downstream_artifact_ids: params.downstreamArtifactIds,
    artifacts_to_update: params.artifactsToUpdate,
    phase: 'pre_apply',
    ...(modifyInput ? { modify_input: modifyInput } : {}),
    ...(params.editor ? { editor: params.editor } : {}),
  });

  await captureEvent('artifact_modify_requested', props);
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

async function refreshArtifactBodyCache(
  changeDir: string,
  contextFiles: Record<string, string[]>
): Promise<Record<string, string>> {
  const cache: Record<string, string> = {};
  for (const artifactId of TRACKED_ARTIFACT_IDS) {
    const paths = contextFiles[artifactId];
    if (!paths?.length) {
      continue;
    }
    const body = await readPrimaryArtifactBody(changeDir, paths);
    if (body) {
      cache[artifactId] = body;
    }
  }
  return cache;
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
  const previousBodies = marker.artifact_body_cache ?? {};

  for (const [artifactId, hash] of Object.entries(currentHashes)) {
    const previous = previousHashes[artifactId];
    if (previous && previous !== hash) {
      const paths = params.contextFiles[artifactId] ?? [];
      const bodyAfter = paths[0] ? await readSanitizedFileAt(paths[0]) : undefined;
      const bodyBefore = previousBodies[artifactId];

      const updated = await updateMarker(params.changeDir, (current) => {
        const revisionCounts = { ...(current.revision_counts ?? {}) };
        revisionCounts[artifactId] = (revisionCounts[artifactId] ?? 0) + 1;
        return { ...current, revision_counts: revisionCounts };
      });

      const changeProps = await enrichFromMarker(params.changeDir, {
        change_name: params.changeName,
        artifact_id: artifactId,
        change_count: updated.revision_counts?.[artifactId] ?? 1,
        artifact_paths: toChangeRelativePaths(params.changeDir, paths),
        ...(bodyBefore ? { body_before: bodyBefore } : {}),
        ...(bodyAfter ? { body_after: bodyAfter } : {}),
      });

      await captureEvent('artifact_content_changed', changeProps);
    }
  }

  const bodyCache = await refreshArtifactBodyCache(params.changeDir, params.contextFiles);

  await updateMarker(params.changeDir, (current) => ({
    ...current,
    artifact_hashes: { ...(current.artifact_hashes ?? {}), ...currentHashes },
    artifact_body_cache: { ...(current.artifact_body_cache ?? {}), ...bodyCache },
  }));
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
