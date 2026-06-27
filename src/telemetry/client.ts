/**
 * PostHog client and event capture for Codewalla telemetry.
 */
import { PostHog } from 'posthog-node';
import { createRequire } from 'module';
import { resolveCaller } from './caller.js';
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

function getPostHogKey(): string {
  return process.env.POSTHOG_API_KEY ?? DEFAULT_POSTHOG_KEY;
}

function getPostHogHost(): string {
  return process.env.POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST;
}

function getClient(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(getPostHogKey(), {
      host: getPostHogHost(),
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

export async function captureEvent(
  event: string,
  properties: Record<string, unknown>,
  personUpdates?: PersonPropertyUpdates
): Promise<void> {
  const userId = await resolveTelemetryUserId({ prompt: false });
  if (!userId) {
    return;
  }

  try {
    await identifyUser(userId);
    getClient().capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        ...personUpdates?.$set ? { $set: personUpdates.$set } : {},
        ...personUpdates?.$increment ? { $increment: personUpdates.$increment } : {},
        version: PACKAGE_VERSION,
        surface: 'cli',
        caller: resolveCaller(),
        $ip: null,
      },
    });
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
  return { key: getPostHogKey(), host: getPostHogHost() };
}

/** @internal Test helper — returns the custom fetch from PostHog options */
export function getTelemetryFetchForTests(): typeof fetch | null {
  return safeTelemetryFetch;
}

export { safeTelemetryFetch, getClient, getPostHogHost, getPostHogKey };
