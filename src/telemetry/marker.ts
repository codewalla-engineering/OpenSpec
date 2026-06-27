/**
 * Change-local telemetry marker (.openspec-telemetry.yaml) for dedupe and durations.
 */
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml';

export const CHANGE_TELEMETRY_FILENAME = '.openspec-telemetry.yaml';

export type EntryPoint = 'propose' | 'new' | 'ff' | 'manual';

export interface ChangeTelemetryMarker {
  started_at?: string;
  entry_point?: EntryPoint;
  workflow_input?: string;
  editor?: string;
  git_head_at_start?: string;
  proposal_ready_at?: string;
  proposal_ready_emitted?: boolean;
  apply_ready_emitted?: boolean;
  artifact_hashes?: Record<string, string>;
  artifact_body_cache?: Record<string, string>;
  revision_counts?: Record<string, number>;
  comprehension_attempt_count?: number;
  comprehension_failure_count?: number;
  comprehension_gate_last_emitted?: {
    passed: boolean;
    best_score_percent?: number;
  };
}

export function markerPath(changeDir: string): string {
  return path.join(changeDir, CHANGE_TELEMETRY_FILENAME);
}

export async function readMarker(changeDir: string): Promise<ChangeTelemetryMarker> {
  try {
    const content = await fs.readFile(markerPath(changeDir), 'utf-8');
    return (parse(content) as ChangeTelemetryMarker) ?? {};
  } catch {
    return {};
  }
}

export async function writeMarker(changeDir: string, marker: ChangeTelemetryMarker): Promise<void> {
  await fs.writeFile(markerPath(changeDir), stringify(marker), 'utf-8');
}

export async function updateMarker(
  changeDir: string,
  update: (current: ChangeTelemetryMarker) => ChangeTelemetryMarker
): Promise<ChangeTelemetryMarker> {
  const current = await readMarker(changeDir);
  const next = update(current);
  await writeMarker(changeDir, next);
  return next;
}

export function hashFileContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export async function hashFileAt(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return hashFileContent(content);
  } catch {
    return null;
  }
}

export function durationSince(isoStart: string | undefined): number | undefined {
  if (!isoStart) {
    return undefined;
  }
  const start = Date.parse(isoStart);
  if (Number.isNaN(start)) {
    return undefined;
  }
  return Date.now() - start;
}

export function durationBetween(isoStart: string | undefined, isoEnd: string | undefined): number | undefined {
  if (!isoStart || !isoEnd) {
    return undefined;
  }
  const start = Date.parse(isoStart);
  const end = Date.parse(isoEnd);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return undefined;
  }
  return end - start;
}

export function totalRevisions(marker: ChangeTelemetryMarker): number {
  const counts = marker.revision_counts ?? {};
  return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
}
