/**
 * Codewalla telemetry identity — human-readable userId (email or username).
 * Stored globally at ~/.config/openspec/telemetry-identity.json (mode 0600).
 */
import { input } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import path from 'path';
import { getGlobalConfigDir } from '../core/global-config.js';

export const IDENTITY_FILENAME = 'telemetry-identity.json';

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{2,64}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IdentityFile {
  userId: string;
}

let cachedUserId: string | null = null;

export class TelemetryIdentityRequiredError extends Error {
  readonly code = 'telemetry_identity_required';

  constructor(message?: string) {
    super(message ?? buildIdentityRequiredMessage());
    this.name = 'TelemetryIdentityRequiredError';
  }
}

export function buildIdentityRequiredMessage(): string {
  return (
    `Telemetry identity required. Run \`openspec init\` or \`openspec update\` interactively, ` +
    `or create ${getIdentityFilePath()}.`
  );
}

export function validateUserId(value: string): true | string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Email or username is required';
  }
  if (EMAIL_REGEX.test(trimmed) || USERNAME_REGEX.test(trimmed)) {
    return true;
  }
  return 'Enter a valid email (user@example.com) or username (2–64 chars: letters, numbers, . _ -)';
}

export function getIdentityFilePath(): string {
  return path.join(getGlobalConfigDir(), IDENTITY_FILENAME);
}

export async function readStoredUserId(): Promise<string | null> {
  try {
    const content = await fs.readFile(getIdentityFilePath(), 'utf-8');
    const parsed = JSON.parse(content) as IdentityFile;
    if (parsed.userId && validateUserId(parsed.userId) === true) {
      return parsed.userId.trim();
    }
  } catch {
    // Missing or invalid file — treat as no identity
  }
  return null;
}

export async function writeStoredUserId(userId: string): Promise<void> {
  const filePath = getIdentityFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload: IdentityFile = { userId: userId.trim() };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 });
  cachedUserId = userId.trim();
}

export async function resolveTelemetryUserId(options?: { prompt?: boolean }): Promise<string | null> {
  if (cachedUserId) {
    return cachedUserId;
  }

  const envUser = process.env.OPENSPEC_TELEMETRY_USER?.trim();
  if (envUser && validateUserId(envUser) === true) {
    cachedUserId = envUser;
    return envUser;
  }

  const stored = await readStoredUserId();
  if (stored) {
    cachedUserId = stored;
    return stored;
  }

  if (options?.prompt === true) {
    try {
      return await promptAndStoreTelemetryIdentity();
    } catch (error) {
      if (error instanceof TelemetryIdentityRequiredError) {
        return null;
      }
      throw error;
    }
  }

  return null;
}

export async function promptAndStoreTelemetryIdentity(): Promise<string> {
  const existing = await resolveTelemetryUserId({ prompt: false });
  if (existing) {
    return existing;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new TelemetryIdentityRequiredError();
  }

  console.log('Codewalla OpenSpec collects usage analytics tied to your email/username.');
  const answer = await input({
    message: 'Enter your Codewalla email or username:',
    validate: validateUserId,
  });
  await writeStoredUserId(answer);
  return answer.trim();
}

export async function requireTelemetryIdentity(): Promise<string> {
  const userId = await resolveTelemetryUserId({ prompt: false });
  if (!userId) {
    throw new TelemetryIdentityRequiredError();
  }
  return userId;
}

export async function setupTelemetryIdentity(options: { interactive: boolean }): Promise<string> {
  const existing = await resolveTelemetryUserId({ prompt: false });
  if (existing) {
    return existing;
  }

  if (options.interactive) {
    return promptAndStoreTelemetryIdentity();
  }

  throw new TelemetryIdentityRequiredError();
}

/** @deprecated Use setupTelemetryIdentity or requireTelemetryIdentity */
export async function ensureTelemetryIdentity(): Promise<string | null> {
  return resolveTelemetryUserId({ prompt: true });
}

/** @internal Test helper */
export function resetIdentityCacheForTests(): void {
  cachedUserId = null;
}
