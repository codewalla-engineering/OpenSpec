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
  getNewChangeSkillTemplate: '652ae41351a285dc42268e1085d65617cd4920a86e6ef1d63c2067533a67ada6',
  getContinueChangeSkillTemplate: '9980b14ea1f6647a7e0810b20b34f04ad60fae5aae9da01a1ada13cd9be38917',
  getApplyChangeSkillTemplate: 'cf70944c7c95293a672349d7acf44eba47c1a0503187d9918ca3fe9f1c56dc37',
  getFfChangeSkillTemplate: '5bfbbcf963f0230b74e324696c15856a27e1f8abcdaadc7e5980ec5ab7cb4d18',
  getSyncSpecsSkillTemplate: '658644cbd7dbf472ae4aae6199ef4ecbcf59db63a327dd294fdfd4fe0e4c2811',
  getOnboardSkillTemplate: 'e871d8ce172bb805ae62a7611aee7a3154d89414f427ad5ef31721c903f13002',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: '9c89c45de5144557599ae6dfef6cb8a579f538e72191c76bd66f0372b79b6fb5',
  getOpsxContinueCommandTemplate: '558e165ff89923563e366fc02a384571afa28230a2eb807d6ca5da776082c9ef',
  getOpsxApplyCommandTemplate: '511cfd2ebda2e4c5907f5f4c01ada635996e7ecb378bbcdd955fc24bd835256a',
  getOpsxFfCommandTemplate: '83ce9c22d737e8ef1300d1ddc06d6cb5bba0a2739d01e7768d50ab7e1375cdd6',
  getArchiveChangeSkillTemplate: '62e27b8053394a6b1f40d6741caeb738794c295bd60b3ed14ef1358d5ce3c4d2',
  getBulkArchiveChangeSkillTemplate: '49e0f2f2ec6c72318243a665de20356da652bb5fdbede3df362ecf7321c346c0',
  getOpsxSyncCommandTemplate: '0229bf73efe28aa47339960c7191e9c85460fa0e3498ecaaf22d619aa1bb64f7',
  getVerifyChangeSkillTemplate: 'a508d9b5239327b644230647c2db76bf67f5e8d37070baebd7f4b57782d79132',
  getOpsxArchiveCommandTemplate: '54d8a2e0041a20d6814f0c32c32040db47c87fabeeb601e4c092e8c9f00f9fb7',
  getOpsxOnboardCommandTemplate: '0673f34a0f81fd173bcfb8c3ac83e2b1c617f7b7564e24e5298d3bd5665a05a9',
  getOpsxBulkArchiveCommandTemplate: 'c8d8feca59e1d1d929b7051fd134ee9643baf7adf4e619b2513cba0f3814cba7',
  getOpsxVerifyCommandTemplate: 'eef9d8aa74ea9a294e0e0d1602728d1f35a8e3e7a539a3691feac4d2f460703a',
  getOpsxProposeSkillTemplate: '80ed756a5a66af0c8b2734ef0108ec8d0d56c1f3b3602b1f79a52b4b7288b962',
  getOpsxProposeCommandTemplate: 'ecd488755d14e6c989ce72cfd8a3b088e585622df55a8d0ba0475df57ea8da31',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '08f905865f86e787262fed252c59ed343ac24db8befa31e5cf8fd99af947263b',
  'openspec-new-change': '3a4b7271f5b527de1f54e57a57ffe79e385ec491750d3601d82e88d11be83563',
  'openspec-continue-change': '7abd23ebf3664531b96e72885b4d3d32d6a96d237c5d1a290c6df7aebfde5e12',
  'openspec-apply-change': 'd79152aa695b8c5951ea98271b06737219d1e740352c3e2c2c95a659e44a9395',
  'openspec-ff-change': '67d4000680f670c69afa0b8337192e7a5044a0bb0438e6563b4155df13ccb806',
  'openspec-sync-specs': 'bde3292f51d96c414205a3207f2ec6297cb425d66974ffe5664034bd448c2de8',
  'openspec-archive-change': '40ce5c267e9ffd8f522f3c8599416e72dac2cdcafff216d6897b7a134d7195b0',
  'openspec-bulk-archive-change': '29a29c62c4bd477d896deee8e848fd7a97e971bafbe24339b65e3d30ea049f13',
  'openspec-verify-change': 'a0783a833b7aff504d14b52045bb407a5343499ee0b73ad96d5988c70a67c32e',
  'openspec-onboard': 'd136b6ab7134d6bceeca73bc2f6037624506587e8df99059f77fe88874256ed1',
  'openspec-propose': '95bc1ad9e105e9abfc68c26cac7580cbaa3f073fc53cecf188a2059c35c3635c',
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
