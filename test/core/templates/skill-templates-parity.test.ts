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
  getContinueChangeSkillTemplate: '8b9af7072a6dae6ff8e086e91147f03b4bed998061e0d7621897cc76a2812317',
  getApplyChangeSkillTemplate: '334bfb02c342b7cbfb6ccf0778644d5425146d688f586e4f3d654befa3ec57a2',
  getFfChangeSkillTemplate: '5bfbbcf963f0230b74e324696c15856a27e1f8abcdaadc7e5980ec5ab7cb4d18',
  getSyncSpecsSkillTemplate: '658644cbd7dbf472ae4aae6199ef4ecbcf59db63a327dd294fdfd4fe0e4c2811',
  getOnboardSkillTemplate: '3c05ab49c86e131a8acf8a05beaf9fb776d6797f697aaf61a04e29be4918f5bd',
  getOpsxExploreCommandTemplate: '37e53590aae7ac6621d4393aa80a5b8af21881323887fa924ed329199fda27e0',
  getOpsxNewCommandTemplate: '9c89c45de5144557599ae6dfef6cb8a579f538e72191c76bd66f0372b79b6fb5',
  getOpsxContinueCommandTemplate: '43c8d58aa0fc13bd6d10d2863f97757d7123f475559ade17b33866db6eab505e',
  getOpsxApplyCommandTemplate: '3c929b4d917101e006213fa23c67b8e2b9bacf4a901f7ed10bed5197848ca9eb',
  getOpsxFfCommandTemplate: '83ce9c22d737e8ef1300d1ddc06d6cb5bba0a2739d01e7768d50ab7e1375cdd6',
  getArchiveChangeSkillTemplate: '62e27b8053394a6b1f40d6741caeb738794c295bd60b3ed14ef1358d5ce3c4d2',
  getBulkArchiveChangeSkillTemplate: '49e0f2f2ec6c72318243a665de20356da652bb5fdbede3df362ecf7321c346c0',
  getOpsxSyncCommandTemplate: '0229bf73efe28aa47339960c7191e9c85460fa0e3498ecaaf22d619aa1bb64f7',
  getVerifyChangeSkillTemplate: 'a508d9b5239327b644230647c2db76bf67f5e8d37070baebd7f4b57782d79132',
  getOpsxArchiveCommandTemplate: '54d8a2e0041a20d6814f0c32c32040db47c87fabeeb601e4c092e8c9f00f9fb7',
  getOpsxOnboardCommandTemplate: '88e1192a56610c6b4f84a26ef4afb4603d690232cf52dfd74e4e660b45253572',
  getOpsxBulkArchiveCommandTemplate: 'c8d8feca59e1d1d929b7051fd134ee9643baf7adf4e619b2513cba0f3814cba7',
  getOpsxVerifyCommandTemplate: 'eef9d8aa74ea9a294e0e0d1602728d1f35a8e3e7a539a3691feac4d2f460703a',
  getOpsxProposeSkillTemplate: 'aa0dc798da9af706c8d09cb0d9613e4726f931186401cc88457cb4a4af8bbbc1',
  getOpsxProposeCommandTemplate: 'ca849a132693715518cbda9582f0deff37beef2f476a64773fb0e30df779c8e4',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '08f905865f86e787262fed252c59ed343ac24db8befa31e5cf8fd99af947263b',
  'openspec-new-change': '3a4b7271f5b527de1f54e57a57ffe79e385ec491750d3601d82e88d11be83563',
  'openspec-continue-change': 'fbd3721d18a5a3a06e904e04a54d31f4c956e324f2d034167767f04c3b4cb4d2',
  'openspec-apply-change': '8084b90f13eff4aa7505f5f25dc3a0324913846c933b39e3e403ea4a39fff4df',
  'openspec-ff-change': '67d4000680f670c69afa0b8337192e7a5044a0bb0438e6563b4155df13ccb806',
  'openspec-sync-specs': 'bde3292f51d96c414205a3207f2ec6297cb425d66974ffe5664034bd448c2de8',
  'openspec-archive-change': '40ce5c267e9ffd8f522f3c8599416e72dac2cdcafff216d6897b7a134d7195b0',
  'openspec-bulk-archive-change': '29a29c62c4bd477d896deee8e848fd7a97e971bafbe24339b65e3d30ea049f13',
  'openspec-verify-change': 'a0783a833b7aff504d14b52045bb407a5343499ee0b73ad96d5988c70a67c32e',
  'openspec-onboard': 'b9b5445e4afa96e88dd5568858e259293c7758fd6202fd898aa27598593caffa',
  'openspec-propose': '7ebac46010e7fb9c07ff84c92df0866dbbe2626e93b09d26c60d3f9286002888',
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
