/**
 * Tool-agnostic user interaction guidance for agent workflows.
 *
 * Cursor's AskUserQuestion is an optional enhancement, not a requirement.
 * All editors (Windsurf, Claude Code, etc.) use plain chat with stop-and-wait.
 */

const WAIT_FOR_USER =
  "STOP and wait for the user's reply before continuing. NEVER answer, infer, or choose on the user's behalf.";

const CURSOR_HINT =
  'On Cursor, you may use the **AskUserQuestion tool** instead of plain chat for this step.';

export const PROMPT_SELECT_CHANGE = `Prompt the user to select a change:
   - Run \`openspec list --json\` to get available changes
   - Present the options clearly in chat (numbered or labeled)
   - Ask ONE selection question; ${WAIT_FOR_USER}
   - ${CURSOR_HINT}`;

export const PROMPT_SELECT_CHANGE_RECENT = `Run \`openspec list --json\` to get available changes sorted by most recently modified. Then prompt the user to select which change to work on in chat. Ask ONE selection question; ${WAIT_FOR_USER}
   - ${CURSOR_HINT}`;

export const PROMPT_MULTI_SELECT_CHANGES = `Prompt the user to select one or more changes in chat:
   - Show each change with its schema
   - Allow multiple selections (e.g., "select all that apply" or comma-separated names)
   - ${WAIT_FOR_USER}
   - ${CURSOR_HINT}`;

export const PROMPT_CONFIRM = `Ask the user to confirm before proceeding in chat:
   - State what they are confirming and the consequences
   - Present clear yes/no options
   - ${WAIT_FOR_USER}
   - ${CURSOR_HINT}`;

export const PROMPT_OPEN_ENDED = `Ask the user an open-ended question in chat (no preset multiple-choice options):
   - ${WAIT_FOR_USER}
   - ${CURSOR_HINT}`;

export const PROMPT_CLARIFY = `Ask the user a clarifying question in chat:
   - ${WAIT_FOR_USER}
   - ${CURSOR_HINT}`;

export const COMPREHENSION_PRESENT_AND_GRADE = `**Present and grade**
   - Present each question in chat with labeled options (A/B/C/D or 1–4)
   - Ask ONE question at a time; after each, STOP and wait for the user's answer before the next question
   - NEVER select answers yourself, infer what the user would pick, or call \`--record-comprehension-pass\` until the user has answered every question
   - ${CURSOR_HINT}
   - Grade: \`score_percent = round(correct / question_count * 100)\`
   - Pass when \`score_percent >= comprehension.thresholdPercent\` (default 80)`;
