import { describe, expect, it } from 'vitest';

import {
  COMPREHENSION_PRESENT_AND_GRADE,
  PROMPT_CLARIFY,
  PROMPT_CONFIRM,
  PROMPT_MULTI_SELECT_CHANGES,
  PROMPT_OPEN_ENDED,
  PROMPT_SELECT_CHANGE,
  PROMPT_SELECT_CHANGE_RECENT,
} from '../../../src/core/templates/workflows/user-prompt-guidance.js';
import { COMPREHENSION_APPLY_GUARDRAIL, COMPREHENSION_QUIZ_GUIDANCE } from '../../../src/core/templates/workflows/comprehension-guidance.js';

const ALL_PROMPTS = [
  PROMPT_SELECT_CHANGE,
  PROMPT_SELECT_CHANGE_RECENT,
  PROMPT_MULTI_SELECT_CHANGES,
  PROMPT_CONFIRM,
  PROMPT_OPEN_ENDED,
  PROMPT_CLARIFY,
  COMPREHENSION_PRESENT_AND_GRADE,
];

describe('user-prompt-guidance', () => {
  it('requires stop-and-wait in every prompt snippet', () => {
    for (const prompt of ALL_PROMPTS) {
      expect(prompt).toContain('STOP');
    }
    for (const prompt of [
      PROMPT_SELECT_CHANGE,
      PROMPT_SELECT_CHANGE_RECENT,
      PROMPT_MULTI_SELECT_CHANGES,
      PROMPT_CONFIRM,
      PROMPT_OPEN_ENDED,
      PROMPT_CLARIFY,
    ]) {
      expect(prompt).toContain("NEVER answer, infer, or choose on the user's behalf");
    }
    expect(COMPREHENSION_PRESENT_AND_GRADE).toContain('NEVER select answers yourself');
  });

  it('treats AskUserQuestion as optional Cursor enhancement, not mandatory', () => {
    for (const prompt of ALL_PROMPTS) {
      expect(prompt).toContain('On Cursor, you may use the **AskUserQuestion tool**');
      expect(prompt).not.toMatch(/Use the \*\*AskUserQuestion tool\*\*/);
    }
  });

  it('forbids agent self-answer and premature pass recording in comprehension', () => {
    expect(COMPREHENSION_PRESENT_AND_GRADE).toContain('NEVER select answers yourself');
    expect(COMPREHENSION_PRESENT_AND_GRADE).toContain('--record-comprehension-pass');
    expect(COMPREHENSION_APPLY_GUARDRAIL).toContain('NEVER answer comprehension quiz questions yourself');
    expect(COMPREHENSION_APPLY_GUARDRAIL).toContain(
      'NEVER call `--record-comprehension-pass` until the user has answered every question'
    );
  });

  it('requires plan-heavy allocation and three options in comprehension guidance', () => {
    expect(COMPREHENSION_QUIZ_GUIDANCE).toContain('contextFiles.plan');
    expect(COMPREHENSION_QUIZ_GUIDANCE).toContain('questionAllocation');
    expect(COMPREHENSION_QUIZ_GUIDANCE).toContain('**Plan**:');
    expect(COMPREHENSION_QUIZ_GUIDANCE).toContain('3 options');
  });
});
