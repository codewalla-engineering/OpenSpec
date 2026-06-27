import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  sanitizeWorkflowInput,
  readWorkflowInputFile,
  normalizeEditor,
  resolveWorkflowInput,
  resolveWorkflowInputAsync,
  VALID_EDITORS,
} from '../../src/telemetry/input.js';

describe('telemetry/input', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-telemetry-input-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('sanitizeWorkflowInput', () => {
    it('trims whitespace', () => {
      expect(sanitizeWorkflowInput('  add auth  ')).toBe('add auth');
    });

    it('redacts common secret patterns', () => {
      const input = 'use sk-abcdefghijklmnopqrst and ghp_abcdefghijklmnopqrstuvwxyz123456';
      const sanitized = sanitizeWorkflowInput(input);
      expect(sanitized).toContain('[redacted]');
      expect(sanitized).not.toContain('sk-abcdefghijklmnopqrst');
      expect(sanitized).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz123456');
    });

    it('truncates long input', () => {
      const long = 'a'.repeat(2500);
      expect(sanitizeWorkflowInput(long).length).toBe(2000);
    });
  });

  describe('readWorkflowInputFile', () => {
    it('reads and sanitizes file content', async () => {
      const filePath = path.join(tempDir, 'input.txt');
      await fs.writeFile(filePath, '  add dark mode  ', 'utf-8');
      expect(await readWorkflowInputFile(filePath)).toBe('add dark mode');
    });
  });

  describe('normalizeEditor', () => {
    it('accepts valid editors', () => {
      expect(normalizeEditor('Cursor')).toBe('cursor');
      expect(normalizeEditor('windsurf')).toBe('windsurf');
      expect(normalizeEditor('claude')).toBe('claude');
    });

    it('returns undefined when omitted', () => {
      expect(normalizeEditor()).toBeUndefined();
    });

    it('rejects invalid editor', () => {
      expect(() => normalizeEditor('vscode')).toThrow(/Invalid --editor/);
    });

    it('exports VALID_EDITORS', () => {
      expect(VALID_EDITORS).toEqual(['cursor', 'windsurf', 'claude']);
    });
  });

  describe('resolveWorkflowInput', () => {
    it('rejects both inline and file options', () => {
      expect(() =>
        resolveWorkflowInput({ workflowInput: 'a', workflowInputFile: '/tmp/x' })
      ).toThrow(/only one of/);
    });

    it('returns undefined for empty inline input', () => {
      expect(resolveWorkflowInput({ workflowInput: '   ' })).toBeUndefined();
    });
  });

  describe('resolveWorkflowInputAsync', () => {
    it('reads from file when workflowInputFile is set', async () => {
      const filePath = path.join(tempDir, 'intent.txt');
      await fs.writeFile(filePath, 'add SSO', 'utf-8');
      const result = await resolveWorkflowInputAsync({ workflowInputFile: filePath });
      expect(result).toBe('add SSO');
    });
  });
});
