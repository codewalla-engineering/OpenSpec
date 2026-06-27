import { describe, it, expect } from 'vitest';
import { buildNextSteps } from '../../src/core/change-status-policy.js';

describe('change-status-policy', () => {
  describe('buildNextSteps', () => {
    it('suggests modify or apply when all artifacts are complete', () => {
      const steps = buildNextSteps({
        changeName: 'my-change',
        artifactStatuses: [
          { id: 'proposal', status: 'done' },
          { id: 'tasks', status: 'done' },
        ],
        allArtifactsComplete: true,
      });

      expect(steps).toEqual([
        'Review planning artifacts; use /opsx:modify to revise or /opsx:apply to implement.',
      ]);
    });
  });
});
