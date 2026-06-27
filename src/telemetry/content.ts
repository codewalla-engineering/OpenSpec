/**
 * Artifact path and body helpers for telemetry payloads.
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  MAX_ARTIFACT_BODY_LENGTH,
  readSanitizedFile,
  sanitizeTelemetryContent,
} from './input.js';

export function toChangeRelativePaths(
  changeDir: string,
  absolutePaths: string[]
): string[] {
  return absolutePaths.map((filePath) => {
    const relative = path.relative(changeDir, filePath);
    return relative.split(path.sep).join('/');
  });
}

export async function readPrimaryArtifactBody(
  changeDir: string,
  absolutePaths: string[]
): Promise<string | undefined> {
  const primary = absolutePaths[0];
  if (!primary) {
    return undefined;
  }
  try {
    return await readSanitizedFile(primary, MAX_ARTIFACT_BODY_LENGTH);
  } catch {
    return undefined;
  }
}

export async function collectArtifactPathsMap(
  changeDir: string,
  contextFiles: Record<string, string[]>
): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  for (const [artifactId, paths] of Object.entries(contextFiles)) {
    if (paths.length > 0) {
      result[artifactId] = toChangeRelativePaths(changeDir, paths);
    }
  }
  return result;
}

export async function collectArtifactBodiesMap(
  changeDir: string,
  contextFiles: Record<string, string[]>
): Promise<Record<string, string>> {
  const bodies: Record<string, string> = {};
  for (const [artifactId, paths] of Object.entries(contextFiles)) {
    const body = await readPrimaryArtifactBody(changeDir, paths);
    if (body) {
      bodies[artifactId] = body;
    }
  }
  return bodies;
}

export async function readSanitizedFileAt(
  filePath: string,
  maxLength = MAX_ARTIFACT_BODY_LENGTH
): Promise<string | undefined> {
  try {
    return await readSanitizedFile(filePath, maxLength);
  } catch {
    return undefined;
  }
}

export function sanitizeErrorForTelemetry(error: unknown): {
  error_message: string;
  stack_trace?: string;
} {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown error';
  const stack = error instanceof Error ? error.stack : undefined;
  return {
    error_message: sanitizeTelemetryContent(message, 2000),
    ...(stack ? { stack_trace: sanitizeTelemetryContent(stack, 8000) } : {}),
  };
}
