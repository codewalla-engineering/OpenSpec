/**
 * Codewalla PostHog telemetry — mandatory when identity is available.
 */
import { resolveTelemetryUserId } from './identity.js';
import { captureEvent, shutdownClient, resetTelemetryClientForTests } from './client.js';
import type { CommandTelemetryContext } from './command-context.js';
import { sanitizeErrorForTelemetry } from './content.js';

export async function canSendTelemetry(): Promise<boolean> {
  const userId = await resolveTelemetryUserId({ prompt: false });
  return userId !== null;
}

export {
  TelemetryIdentityRequiredError,
  buildIdentityRequiredMessage,
  resolveTelemetryUserId,
  requireTelemetryIdentity,
  setupTelemetryIdentity,
  promptAndStoreTelemetryIdentity,
  getIdentityFilePath,
  validateUserId,
  ensureTelemetryIdentity,
} from './identity.js';
export { DEFAULT_POSTHOG_KEY, DEFAULT_POSTHOG_HOST, safeTelemetryFetch } from './client.js';
export {
  sanitizeWorkflowInput,
  sanitizeTelemetryContent,
  readSanitizedFile,
  readWorkflowInputFile,
  normalizeEditor,
  resolveWorkflowInputAsync,
  VALID_EDITORS,
  MAX_ARTIFACT_BODY_LENGTH,
  type WorkflowEditor,
} from './input.js';
export {
  resolveTelemetryCommandPath,
  buildCommandTelemetryContext,
  type CommandTelemetryContext,
  type CommandCategory,
} from './command-context.js';
export { resolveCaller } from './caller.js';

export async function trackCommand(
  commandName: string,
  version: string,
  context?: CommandTelemetryContext
): Promise<void> {
  await captureEvent('command_executed', {
    command: commandName,
    version,
    ...(context?.change_name ? { change_name: context.change_name } : {}),
    ...(context?.schema ? { schema: context.schema } : {}),
    ...(context?.command_category ? { command_category: context.command_category } : {}),
  });
}

export async function trackEvent(
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  await captureEvent(event, properties);
}

export async function trackCommandFailed(
  command: string,
  error: unknown,
  errorCode?: string
): Promise<void> {
  const errorDetails = sanitizeErrorForTelemetry(error);
  await trackEvent('command_failed', {
    command,
    error_code: errorCode ?? (error instanceof Error ? error.name : 'unknown'),
    ...errorDetails,
  });
}

export async function shutdown(): Promise<void> {
  await shutdownClient();
}

/** @internal Test helper */
export function resetTelemetryForTests(): void {
  resetTelemetryClientForTests();
}

export {
  trackWorkflowStarted,
  maybeEmitProposalReady,
  maybeEmitApplyReady,
  trackArtifactInstructions,
  trackArtifactContentChanges,
  trackArtifactModifyRequested,
  trackChangeArchived,
  buildSpecDeltasFromUpdates,
} from './workflow.js';

export {
  trackComprehensionAttempt,
  trackComprehensionGateChecked,
  trackComprehensionRetakeRequired,
  incrementComprehensionAttempt,
  incrementComprehensionFailureCount,
  enrichFromMarker,
} from './comprehension.js';

export type { EntryPoint } from './marker.js';
