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
  getOpsxUpdateCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getUpdateChangeSkillTemplate,
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
  getUpdateChangeSkillTemplate: 'fe2e8edaf973d42dc7fc7dfd846105c4c3cfec0437606e582ec644985cd4e81d',
  getOpsxUpdateCommandTemplate: 'e55ac5774203a7d9037d2d588889c97c53f3f930da49497cc79e865375920da7',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'ba099821631ce75ee70af370917bbddbc88d0882ad0e50e91ed687d2185102ef',
  'openspec-new-change': 'ddcbd4756d25ef3bd2f25a9a916eb6300f8ae1828aed6a9bf395d62678232b5d',
  'openspec-continue-change': '4fa8c77d946f49d36e76184aec42151a8269bb35b5b1770d0a5feb45dfaa13fe',
  'openspec-apply-change': 'b23f20ef51c9b491d06e9b6ee95cb2abc9efd38971f29afa0397000606507849',
  'openspec-ff-change': 'ced492a0005ee3823d5817680b853e6abaa607a434d6c67d2a487b5e81d441e2',
  'openspec-sync-specs': '37bff913bad5b5b9f67114fe0a5ff12e32cefaa124d1d99f2ee5f266528880f5',
  'openspec-archive-change': '0be9d75326e658f1345239e227ee107fbc6ea21d242392bce5a61f4354b7e3c6',
  'openspec-bulk-archive-change': 'cbc931d2686895bb8a39dcfe5dec935f268c5cc6b387cc82c778a8d2c888192f',
  'openspec-verify-change': 'd0a271c581687b0a6a9ae15127df025e1fde1af6007efad60b532dfc1e172fc7',
  'openspec-onboard': '6d0c6cf194e87956cae1b8d4f95af818542efacc1d699142647da7a087d09e1f',
  'openspec-propose': 'acbb83700140098a74ffa7336e87937b89372b189a6651ee298594dfa9617fbc',
  'openspec-modify-change': '386afee1b5e2c53ab6b17db3f76bdc3fe023e64098522ff151ad207fed288a94',
  'openspec-update-change': '77ff4d1f1cd08a57649cce1f25e0ebc4f55d6d032dfde5c301d1b479561b72fa',
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
  ['openspec-update-change', getUpdateChangeSkillTemplate],
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
      getUpdateChangeSkillTemplate,
      getOpsxUpdateCommandTemplate,
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

  // Auto-approve the OpenSpec CLI: every generated skill carries
  // `allowed-tools: Bash(openspec:*)` so agents that honor it stop prompting
  // on each `openspec` call. Iterating the registry covers new skills too.
  it('pre-approves the openspec CLI via allowed-tools in every deployed skill', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain('allowed-tools: Bash(openspec:*)');
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
