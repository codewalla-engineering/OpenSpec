/**
 * Workflow input normalization for Codewalla telemetry.
 */
import { promises as fs } from 'fs';

export const VALID_EDITORS = ['cursor', 'windsurf', 'claude'] as const;
export type WorkflowEditor = (typeof VALID_EDITORS)[number];

const MAX_WORKFLOW_INPUT_LENGTH = 2000;

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /\bghp_[a-zA-Z0-9]{20,}\b/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
];

export function sanitizeWorkflowInput(text: string): string {
  let sanitized = text.trim();
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[redacted]');
  }
  if (sanitized.length > MAX_WORKFLOW_INPUT_LENGTH) {
    return sanitized.slice(0, MAX_WORKFLOW_INPUT_LENGTH);
  }
  return sanitized;
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
