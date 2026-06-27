import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';

import {
  getConfigPath,
  readConfig,
  writeConfig,
  getTelemetryConfig,
  updateTelemetryConfig,
} from '../../src/telemetry/config.js';

describe('telemetry/config', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  function restoreEnv(env: NodeJS.ProcessEnv): void {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, env);
  }

  function defaultConfigDir(): string {
    return os.platform() === 'win32'
      ? path.join(tempDir, 'appdata', 'openspec')
      : path.join(tempDir, '.config', 'openspec');
  }

  function defaultConfigPath(): string {
    return path.join(defaultConfigDir(), 'config.json');
  }

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-telemetry-test-${randomUUID()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
    delete process.env.XDG_CONFIG_HOME;
    process.env.APPDATA = path.join(tempDir, 'appdata');
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getConfigPath', () => {
    it('should return path to config.json in the default config directory', () => {
      expect(getConfigPath()).toBe(defaultConfigPath());
    });

    it('should use XDG_CONFIG_HOME when set', () => {
      const xdgConfigHome = path.join(tempDir, 'xdg-config');
      process.env.XDG_CONFIG_HOME = xdgConfigHome;
      expect(getConfigPath()).toBe(path.join(xdgConfigHome, 'openspec', 'config.json'));
    });
  });

  describe('readConfig', () => {
    it('should return empty object when config file does not exist', async () => {
      expect(await readConfig()).toEqual({});
    });

    it('should load valid config from file', async () => {
      fs.mkdirSync(defaultConfigDir(), { recursive: true });
      fs.writeFileSync(
        defaultConfigPath(),
        JSON.stringify({ telemetry: { userId: 'admin@codewalla.com' } })
      );
      expect(await readConfig()).toEqual({
        telemetry: { userId: 'admin@codewalla.com' },
      });
    });

    it('should return empty object for invalid JSON', async () => {
      fs.mkdirSync(defaultConfigDir(), { recursive: true });
      fs.writeFileSync(defaultConfigPath(), '{ invalid json }');
      expect(await readConfig()).toEqual({});
    });
  });

  describe('writeConfig', () => {
    it('should create directory if it does not exist', async () => {
      await writeConfig({ featureFlags: { beta: true } });
      expect(fs.existsSync(defaultConfigDir())).toBe(true);
    });

    it('should preserve existing fields when updating', async () => {
      fs.mkdirSync(defaultConfigDir(), { recursive: true });
      fs.writeFileSync(
        defaultConfigPath(),
        JSON.stringify({ existingField: 'preserved', telemetry: { userId: 'old' } })
      );
      await writeConfig({ telemetry: { profile: 'core' } });
      const parsed = JSON.parse(fs.readFileSync(defaultConfigPath(), 'utf-8'));
      expect(parsed.existingField).toBe('preserved');
      expect(parsed.telemetry.userId).toBe('old');
      expect(parsed.telemetry.profile).toBe('core');
    });
  });

  describe('getTelemetryConfig', () => {
    it('should return empty object when no config exists', async () => {
      expect(await getTelemetryConfig()).toEqual({});
    });
  });

  describe('updateTelemetryConfig', () => {
    it('should create telemetry config when none exists', async () => {
      await updateTelemetryConfig({ profile: 'core' });
      const parsed = JSON.parse(fs.readFileSync(defaultConfigPath(), 'utf-8'));
      expect(parsed.telemetry.profile).toBe('core');
    });
  });
});
