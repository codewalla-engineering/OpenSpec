import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getModifyChangeSkillTemplate,
  getOpsxModifyCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '7d2f54e74fffcb36aaaa4498a4a8b033142bb25945fb9b2de532354acbe76b9c',
  getNewChangeSkillTemplate: '324c8cd7428531bcf2f56f1ab4fbcb747ae3d6ecd0128c2fc042b4d09d82a03e',
  getContinueChangeSkillTemplate: '8b9af7072a6dae6ff8e086e91147f03b4bed998061e0d7621897cc76a2812317',
  getApplyChangeSkillTemplate: '707cd158311f6ecb12f2cfdfa4b2dc99166fd2f23eda46ce415747f34694dfe9',
  getFfChangeSkillTemplate: '8587acd740f43a44d6d3251d86bf4fa6cfef43c507dca606913bab3a3154c0ba',
  getSyncSpecsSkillTemplate: '658644cbd7dbf472ae4aae6199ef4ecbcf59db63a327dd294fdfd4fe0e4c2811',
  getOnboardSkillTemplate: '3c05ab49c86e131a8acf8a05beaf9fb776d6797f697aaf61a04e29be4918f5bd',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: '5766e8f6a2e4513a328c58f38cb2aeb77a32a034d164ad83115c1a33197c36c9',
  getOpsxContinueCommandTemplate: '43c8d58aa0fc13bd6d10d2863f97757d7123f475559ade17b33866db6eab505e',
  getOpsxApplyCommandTemplate: '16ed5fc1a0f2e1e527392fcc78c097372dd4b453beea62d3d78b941728e7525a',
  getOpsxFfCommandTemplate: '2fd3d84150969bd81b8a1af193bf5f0bbac991c8ed52864da0e0ced3fe6d0a71',
  getArchiveChangeSkillTemplate: '62e27b8053394a6b1f40d6741caeb738794c295bd60b3ed14ef1358d5ce3c4d2',
  getBulkArchiveChangeSkillTemplate: '49e0f2f2ec6c72318243a665de20356da652bb5fdbede3df362ecf7321c346c0',
  getOpsxSyncCommandTemplate: '0229bf73efe28aa47339960c7191e9c85460fa0e3498ecaaf22d619aa1bb64f7',
  getVerifyChangeSkillTemplate: 'a508d9b5239327b644230647c2db76bf67f5e8d37070baebd7f4b57782d79132',
  getOpsxArchiveCommandTemplate: '54d8a2e0041a20d6814f0c32c32040db47c87fabeeb601e4c092e8c9f00f9fb7',
  getOpsxOnboardCommandTemplate: '88e1192a56610c6b4f84a26ef4afb4603d690232cf52dfd74e4e660b45253572',
  getOpsxBulkArchiveCommandTemplate: 'c8d8feca59e1d1d929b7051fd134ee9643baf7adf4e619b2513cba0f3814cba7',
  getOpsxVerifyCommandTemplate: 'eef9d8aa74ea9a294e0e0d1602728d1f35a8e3e7a539a3691feac4d2f460703a',
  getOpsxProposeSkillTemplate: '9844b8b0ecced3d482665f53e7dff28654205c5e11b9dad1c7970d85ba5c8372',
  getOpsxProposeCommandTemplate: '3fff9ca5176201da7d3cb4443e7fa95dda4c45447686dfcc223880dbe7b44d3e',
  getModifyChangeSkillTemplate: 'b8a7144b92b7beba4d1b8634abd892ba20c51c4930df319139135ef886ae524d',
  getOpsxModifyCommandTemplate: '05fe8fcb664b4b1e4acdddead00eb1a34b5323e202e51e0706029ae3de3775da',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '08f905865f86e787262fed252c59ed343ac24db8befa31e5cf8fd99af947263b',
  'openspec-new-change': '5f698cee03e982e9815fe2dff58ca944e40f57f37f7bf38bbcefda1eb3e1df3b',
  'openspec-continue-change': 'fbd3721d18a5a3a06e904e04a54d31f4c956e324f2d034167767f04c3b4cb4d2',
  'openspec-apply-change': '7932afbf4ebe215513a33f2a2df9d96b3345ae5b1ec485fcf612fa3d313727bb',
  'openspec-ff-change': '9162409d55571a22c6209d0fe49fcc8c79061da085e8e14db2c6483f8eebc7ad',
  'openspec-sync-specs': 'bde3292f51d96c414205a3207f2ec6297cb425d66974ffe5664034bd448c2de8',
  'openspec-archive-change': '40ce5c267e9ffd8f522f3c8599416e72dac2cdcafff216d6897b7a134d7195b0',
  'openspec-bulk-archive-change': '29a29c62c4bd477d896deee8e848fd7a97e971bafbe24339b65e3d30ea049f13',
  'openspec-verify-change': 'a0783a833b7aff504d14b52045bb407a5343499ee0b73ad96d5988c70a67c32e',
  'openspec-onboard': 'b9b5445e4afa96e88dd5568858e259293c7758fd6202fd898aa27598593caffa',
  'openspec-propose': '870701f67ee2fdf560cc9ab451b07545ccb72f71a4fa02224975360051ac30c5',
  'openspec-modify-change': '702b794229b3412b46f8000e967bd47e0422d75a45248dd336db369782914ea6',
};

// Intentionally excludes getFeedbackSkillTemplate: this list only models templates
// deployed via generateSkillContent, while feedback is covered in function payload parity.
const GENERATED_SKILL_FACTORIES: Array<[string, () => SkillTemplate]> = [
  ['openspec-explore', getExploreSkillTemplate],
  ['openspec-new-change', getNewChangeSkillTemplate],
  ['openspec-continue-change', getContinueChangeSkillTemplate],
  ['openspec-apply-change', getApplyChangeSkillTemplate],
  ['openspec-ff-change', getFfChangeSkillTemplate],
  ['openspec-sync-specs', getSyncSpecsSkillTemplate],
  ['openspec-archive-change', getArchiveChangeSkillTemplate],
  ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
  ['openspec-verify-change', getVerifyChangeSkillTemplate],
  ['openspec-onboard', getOnboardSkillTemplate],
  ['openspec-propose', getOpsxProposeSkillTemplate],
  ['openspec-modify-change', getModifyChangeSkillTemplate],
];

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('skill templates split parity', () => {
  it('preserves all template function payloads exactly', () => {
    const functionFactories: Record<string, () => unknown> = {
      getExploreSkillTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxExploreCommandTemplate,
      getOpsxNewCommandTemplate,
      getOpsxContinueCommandTemplate,
      getOpsxApplyCommandTemplate,
      getOpsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getOpsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxOnboardCommandTemplate,
      getOpsxBulkArchiveCommandTemplate,
      getOpsxVerifyCommandTemplate,
      getOpsxProposeSkillTemplate,
      getOpsxProposeCommandTemplate,
      getModifyChangeSkillTemplate,
      getOpsxModifyCommandTemplate,
      getFeedbackSkillTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    const actualHashes = Object.fromEntries(
      GENERATED_SKILL_FACTORIES.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });

  // Iterating the production registries (not a local list) means a newly
  // added workflow is covered automatically; the full-constant containment
  // check fails if any template's interpolation drifts.
  it('teaches store selection in every deployed skill template', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain(STORE_SELECTION_GUIDANCE);
    }
  });

  it('teaches store selection in every deployed opsx command template', () => {
    for (const entry of getCommandContents()) {
      expect(entry.body, entry.id).toContain(STORE_SELECTION_GUIDANCE);
    }

    // Feedback has no store-capable command and intentionally carries no
    // store teaching; it ships outside both registries.
    expect(getFeedbackSkillTemplate().instructions).not.toContain('**Store selection:**');
  });

  it('generates no workspace-planning residue in any workflow template (4.1)', () => {
    const allSkills: Array<[string, () => SkillTemplate]> = [
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
    ];

    for (const [dirName, createTemplate] of allSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');
      expect(content, dirName).not.toContain('workspace-planning');
      expect(content, dirName).not.toContain('Workspace guard');
    }
  });
});
