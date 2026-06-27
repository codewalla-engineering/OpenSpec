/**
 * Codewalla PostHog telemetry — mandatory when identity is available.
 */
import { resolveTelemetryUserId } from './identity.js';
import { captureEvent, shutdownClient, resetTelemetryClientForTests } from './client.js';

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
  readWorkflowInputFile,
  normalizeEditor,
  resolveWorkflowInputAsync,
  VALID_EDITORS,
  type WorkflowEditor,
} from './input.js';

export async function trackCommand(commandName: string, version: string): Promise<void> {
  await captureEvent('command_executed', {
    command: commandName,
    version,
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
  await trackEvent('command_failed', {
    command,
    error_code: errorCode ?? (error instanceof Error ? error.name : 'unknown'),
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
  trackComprehensionRetakeRequired,
  trackChangeArchived,
  buildSpecDeltasFromUpdates,
} from './workflow.js';

export type { EntryPoint } from './marker.js';
