/**
 * PostHog client and event capture for Codewalla telemetry.
 */
import { PostHog } from 'posthog-node';
import { createRequire } from 'module';
import { resolveCaller } from './caller.js';
import { getEventSchema, type TelemetryEventName } from './events.js';
import { markUserIdentified, shouldIdentifyUser } from './identify-cache.js';
import { resolveTelemetryUserId } from './identity.js';

const require = createRequire(import.meta.url);
const { version: PACKAGE_VERSION } = require('../../package.json');

export const DEFAULT_POSTHOG_KEY = 'phc_s56WNC4SgBSQBqa5jgZ22MpCmxv5rUsAy4g6MikQaZtD';
export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const TELEMETRY_REQUEST_TIMEOUT_MS = 1000;

let posthogClient: PostHog | null = null;
let identifiedUserId: string | null = null;

async function safeTelemetryFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init);
    if (response.ok) {
      return response;
    }
  } catch {
    // Silent failure
  }

  return new Response(null, { status: 204 });
}

// The destination is hard-coded by design. This is an internal tool and its
// analytics are not customizable — POSTHOG_API_KEY / POSTHOG_HOST env vars are
// deliberately ignored.
function getClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(DEFAULT_POSTHOG_KEY, {
      host: DEFAULT_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      fetchRetryCount: 0,
      requestTimeout: TELEMETRY_REQUEST_TIMEOUT_MS,
      preloadFeatureFlags: false,
      disableRemoteConfig: true,
      disableSurveys: true,
      fetch: safeTelemetryFetch,
    });
  }
  return posthogClient;
}

async function identifyUser(userId: string): Promise<void> {
  if (identifiedUserId === userId) {
    return;
  }
  if (!(await shouldIdentifyUser(userId))) {
    identifiedUserId = userId;
    return;
  }
  try {
    getClient().identify({
      distinctId: userId,
      properties: { user_id: userId },
    });
    await markUserIdentified(userId);
    identifiedUserId = userId;
  } catch {
    // Silent failure
  }
}

export interface PersonPropertyUpdates {
  $set?: Record<string, unknown>;
  $increment?: Record<string, number>;
}

function isTelemetryDisabled(): boolean {
  // Test-harness escape hatch only — keeps spawned CLI e2e tests offline.
  // Not a user-facing setting; do not document as configuration.
  return process.env.OPENSPEC_TELEMETRY_DISABLE === '1';
}

function telemetryDebug(message: string): void {
  if (process.env.OPENSPEC_TELEMETRY_DEBUG === '1') {
    console.error(`[openspec telemetry] ${message}`);
  }
}

function filterProps(
  props: Record<string, unknown>,
  allowed: readonly string[] | undefined,
  event: string,
  kind: string
): Record<string, unknown> {
  if (!allowed) {
    return {};
  }
  const allowedSet = new Set(allowed);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (allowedSet.has(key)) {
      filtered[key] = value;
    } else {
      telemetryDebug(`strip "${key}" from "${event}" (${kind} not in schema)`);
    }
  }
  return filtered;
}

export async function captureEvent(
  event: TelemetryEventName,
  properties: Record<string, unknown> = {},
  personUpdates?: PersonPropertyUpdates
): Promise<void> {
  const schema = getEventSchema(event);
  if (!schema) {
    telemetryDebug(`drop "${event}": not in event registry`);
    return;
  }

  if (isTelemetryDisabled()) {
    telemetryDebug(`skip "${event}": telemetry disabled`);
    return;
  }

  const userId = await resolveTelemetryUserId({ prompt: false });
  if (!userId) {
    telemetryDebug(`skip "${event}": no identity configured`);
    return;
  }

  try {
    await identifyUser(userId);
    const client = getClient();
    telemetryDebug(`capture "${event}" → ${DEFAULT_POSTHOG_HOST} (key ${DEFAULT_POSTHOG_KEY.slice(0, 10)}…)`);
    client.capture({
      distinctId: userId,
      event,
      properties: {
        ...filterProps(properties, schema.props, event, 'property'),
        ...(personUpdates?.$set
          ? { $set: filterProps(personUpdates.$set, schema.personSet, event, '$set') }
          : {}),
        ...(personUpdates?.$increment
          ? { $increment: filterProps(personUpdates.$increment, schema.personIncrement, event, '$increment') }
          : {}),
        version: PACKAGE_VERSION,
        surface: 'cli',
        caller: resolveCaller(),
        $ip: null,
      },
    });
    // flushAt:1 queues immediately, but the HTTP send is still async.
    // Await flush so postAction shutdown cannot race and drop the event.
    await client.flush();
  } catch {
    // Silent failure
  }
}

export async function shutdownClient(): Promise<void> {
  if (!posthogClient) {
    return;
  }

  try {
    await posthogClient.shutdown();
  } catch {
    // Silent failure
  } finally {
    posthogClient = null;
    identifiedUserId = null;
  }
}

/** @internal Test helper */
export function resetTelemetryClientForTests(): void {
  posthogClient = null;
  identifiedUserId = null;
}

/** @internal Test helper — exposes client config for assertions */
export function getClientConfigForTests(): { key: string; host: string } | null {
  if (!posthogClient) {
    return null;
  }
  return { key: DEFAULT_POSTHOG_KEY, host: DEFAULT_POSTHOG_HOST };
}

/** @internal Test helper — returns the custom fetch from PostHog options */
export function getTelemetryFetchForTests(): typeof fetch | null {
  return safeTelemetryFetch;
}

export { safeTelemetryFetch, getClient };
