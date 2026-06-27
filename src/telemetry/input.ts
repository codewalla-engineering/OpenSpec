/**
 * Workflow input normalization for Codewalla telemetry.
 */
import { promises as fs } from 'fs';

export const VALID_EDITORS = ['cursor', 'windsurf', 'claude'] as const;
export type WorkflowEditor = (typeof VALID_EDITORS)[number];

const MAX_WORKFLOW_INPUT_LENGTH = 2000;
export const MAX_ARTIFACT_BODY_LENGTH = 8000;

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /\bghp_[a-zA-Z0-9]{20,}\b/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
];

function redactSecrets(text: string): string {
  let sanitized = text.trim();
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }
  return sanitized;
}

export function sanitizeTelemetryContent(text: string, maxLength = MAX_WORKFLOW_INPUT_LENGTH): string {
  const sanitized = redactSecrets(text);
  if (sanitized.length > maxLength) {
    return sanitized.slice(0, maxLength);
  }
  return sanitized;
}

export function sanitizeWorkflowInput(text: string): string {
  return sanitizeTelemetryContent(text, MAX_WORKFLOW_INPUT_LENGTH);
}

export async function readSanitizedFile(
  filePath: string,
  maxLength = MAX_ARTIFACT_BODY_LENGTH
): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return sanitizeTelemetryContent(content, maxLength);
}

export async function readWorkflowInputFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return sanitizeWorkflowInput(content);
}

export function normalizeEditor(value?: string): WorkflowEditor | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if ((VALID_EDITORS as readonly string[]).includes(normalized)) {
    return normalized as WorkflowEditor;
  }
  throw new Error(
    `Invalid --editor "${value}". Use: ${VALID_EDITORS.join(', ')}.`
  );
}

export function resolveWorkflowInput(options: {
  workflowInput?: string;
  workflowInputFile?: string;
}): string | undefined {
  if (options.workflowInput !== undefined && options.workflowInputFile !== undefined) {
    throw new Error('Pass only one of --workflow-input or --workflow-input-file.');
  }
  if (options.workflowInput !== undefined) {
    const sanitized = sanitizeWorkflowInput(options.workflowInput);
    return sanitized.length > 0 ? sanitized : undefined;
  }
  return undefined;
}

export async function resolveWorkflowInputAsync(options: {
  workflowInput?: string;
  workflowInputFile?: string;
}): Promise<string | undefined> {
  if (options.workflowInput !== undefined && options.workflowInputFile !== undefined) {
    throw new Error('Pass only one of --workflow-input or --workflow-input-file.');
  }
  if (options.workflowInputFile !== undefined) {
    const sanitized = await readWorkflowInputFile(options.workflowInputFile);
    return sanitized.length > 0 ? sanitized : undefined;
  }
  return resolveWorkflowInput(options);
}
