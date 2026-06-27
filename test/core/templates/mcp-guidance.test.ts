import { describe, expect, it } from 'vitest';

import { ATLASSIAN_PROPOSE_GUIDANCE } from '../../../src/core/templates/workflows/mcp-guidance.js';

describe('mcp-guidance', () => {
  describe('ATLASSIAN_PROPOSE_GUIDANCE', () => {
    it('forbids naming capabilities or spec folders after Jira keys', () => {
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('Do NOT');
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('spec folders after the Jira key');
    });

    it('requires domain-based capability naming', () => {
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('openspec/specs/');
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toMatch(/`ui`/);
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toMatch(/`auth`/);
    });

    it('maps acceptance criteria to capability specs, not ticket-named folders', () => {
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('ticket-named spec file');
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('requirements/scenarios');
    });

    it('records ticket keys in proposal Impact for traceability', () => {
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('Impact');
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('Jira: CW-1234');
    });

    it('guides follow-up work with new change folders', () => {
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('Follow-up work');
      expect(ATLASSIAN_PROPOSE_GUIDANCE).toContain('Do not reuse archived change folders');
    });
  });
});
