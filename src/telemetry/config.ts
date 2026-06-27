/**
 * Global configuration for OpenSpec CLI state.
 * Stores settings in the platform-appropriate config directory.
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  GLOBAL_CONFIG_DIR_NAME,
  GLOBAL_CONFIG_FILE_NAME,
  getGlobalConfigDir,
} from '../core/global-config.js';

export const CONFIG_DIR_NAME = GLOBAL_CONFIG_DIR_NAME;
export const CONFIG_FILE_NAME = GLOBAL_CONFIG_FILE_NAME;

export interface GlobalConfig {
  [key: string]: unknown;
}

type ConfigReadResult =
  | { status: 'missing' }
  | { status: 'ok'; config: GlobalConfig }
  | { status: 'invalid'; config: GlobalConfig };

function getConfigDir(): string {
  return getGlobalConfigDir();
}

async function readConfigFile(configPath: string): Promise<ConfigReadResult> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return { status: 'ok', config: JSON.parse(content) as GlobalConfig };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { status: 'missing' };
    }
    return { status: 'invalid', config: {} };
  }
}

async function writeConfigFile(configPath: string, config: GlobalConfig): Promise<void> {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE_NAME);
}

export async function readConfig(): Promise<GlobalConfig> {
  const configPath = getConfigPath();
  const read = await readConfigFile(configPath);
  return read.status === 'ok' ? read.config : {};
}

export async function writeConfig(updates: Partial<GlobalConfig>): Promise<void> {
  const configPath = getConfigPath();
  const existing = await readConfig();
  const merged = { ...existing, ...updates };

  if (updates.telemetry && existing.telemetry && typeof existing.telemetry === 'object') {
    merged.telemetry = {
      ...(existing.telemetry as Record<string, unknown>),
      ...(updates.telemetry as Record<string, unknown>),
    };
  }

  await writeConfigFile(configPath, merged);
}

export async function getTelemetryConfig(): Promise<Record<string, unknown>> {
  const config = await readConfig();
  const telemetry = config.telemetry;
  return telemetry && typeof telemetry === 'object' ? (telemetry as Record<string, unknown>) : {};
}

export async function updateTelemetryConfig(updates: Record<string, unknown>): Promise<void> {
  const existing = await getTelemetryConfig();
  await writeConfig({
    telemetry: { ...existing, ...updates },
  });
}
