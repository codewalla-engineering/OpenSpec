import { describe, it, expect } from 'vitest';
import { toChangeRelativePaths } from '../../src/telemetry/content.js';
import { sanitizeTelemetryContent } from '../../src/telemetry/input.js';

describe('telemetry/content', () => {
  it('redacts secrets in telemetry content', () => {
    const sanitized = sanitizeTelemetryContent('token sk-abcdefghijklmnopqrst and more');
    expect(sanitized).toContain('[redacted]');
    expect(sanitized).not.toContain('sk-abcdefghijklmnopqrst');
  });

  it('truncates long bodies', () => {
    const sanitized = sanitizeTelemetryContent('x'.repeat(9000), 100);
    expect(sanitized.length).toBe(100);
  });

  it('returns change-relative posix paths', () => {
    const paths = toChangeRelativePaths('/change', ['/change/specs/ui/spec.md']);
    expect(paths).toEqual(['specs/ui/spec.md']);
  });
});
