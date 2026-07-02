/**
 * Comprehension quiz guidance for apply workflows.
 *
 * Interpolated into apply skill and slash command templates so agents run
 * a spec comprehension gate before implementation.
 */

import { COMPREHENSION_PRESENT_AND_GRADE } from './user-prompt-guidance.js';

export const COMPREHENSION_QUIZ_GUIDANCE = `4. **Comprehension quiz (required before implementation)**

   **STOP — the human developer answers every question.** NEVER answer, infer, or select answers on the user's behalf, and NEVER run \`--record-comprehension-pass\` until the user has answered every question. Ask one question, then end your turn and wait for their reply.

   After \`openspec instructions apply --change "<name>" --json\`, check comprehension status:

   - If \`missingComprehension\` is true OR \`comprehension.required && !comprehension.passed\`:
     - Do NOT edit application source code or mark task checkboxes yet
     - Read \`contextFiles.proposal\`, \`contextFiles.design\`, \`contextFiles.specs\`, \`contextFiles.plan\`, and \`contextFiles.tasks\` (or the \`tasks\` array in apply JSON)
     - Use \`comprehension.questionCount\` and \`comprehension.questionAllocation\` from the JSON

   **Generate questions**
   - Create exactly \`comprehension.questionCount\` multiple-choice questions
   - **Follow \`comprehension.questionAllocation\`** — generate the exact count per category (e.g. plan×4, specs×1); do not invent your own split
   - Each question maps to one artifact category:
     - **Proposal**: motivation, scope, or impact from \`proposal.md\`
     - **Design**: decisions, trade-offs, or approach from \`design.md\`
     - **Specs**: a \`### Requirement:\` or \`#### Scenario:\` from delta specs
     - **Plan**: code map, file targets, test plan, sequencing, or alignment with design from \`plan.md\`
     - **Tasks**: conceptual understanding of the implementation approach from pending (unchecked) tasks
   - Do NOT use completed tasks as question sources
   - Each question: **3 options** (\`comprehension.optionsPerQuestion\`, default 3) — 1 correct from source substance, 2 plausible distractors from other proposal/design/spec/plan/task substance in the change

   **Plan question quality**
   - Test code map, file targets, test plan, sequencing, or alignment with design
   - **Forbidden**: section numbers, verbatim headings, trivia answerable without reading plan substance

   **Task question quality**
   - Test scope, approach, dependencies, sequencing rationale, or alignment with proposal/design/plan
   - **Forbidden**: task numbers, checklist order, "which task says X verbatim", or answers identifiable only by task index or checkbox position
   - Good: "What is the primary file where quiz rules are centralized?" (answer from task substance)
   - Bad: "Which task number updates \`comprehension-guidance.ts\`?" or "What is the exact text of task 2.1?"

   ${COMPREHENSION_PRESENT_AND_GRADE}

   **On failure (score below threshold)**
   - Announce score and that a new quiz is required
   - Update \`.comprehension-session.yaml\` in the change dir with \`used_sources\` from this attempt
   - Generate a NEW question set using different proposal/design/spec/plan/task sources (avoid \`used_sources\`)
   - Retry until pass

   **On pass**
   \`\`\`bash
   openspec instructions apply --change "<name>" --record-comprehension-pass --score <score> --attempt <n> --question-count <count> --json
   \`\`\`
   - Re-run \`openspec instructions apply --change "<name>" --json\`
   - Confirm \`state\` is \`"ready"\` and \`comprehension.passed\` is true before continuing

   **Output template**
   \`\`\`
   ## Applying: <change-name> — comprehension check

   plan×N, specs×N, design×N, proposal×N, tasks×N → <questionCount> questions (3 options each)

   Question 1/N: ...
   ...
   ✓ Comprehension passed (<score>%, attempt <n>)
   \`\`\`

   Then continue to step 5 (show progress) and implementation.`;

export const COMPREHENSION_APPLY_GUARDRAIL = `- NEVER implement code or mark tasks while \`missingComprehension\` is true
- NEVER skip the comprehension quiz when the apply JSON requires it
- NEVER answer comprehension quiz questions yourself — the human developer must answer every question
- NEVER call \`--record-comprehension-pass\` until the user has answered every question
- If the user asks to skip the quiz, refuse and explain they must pass or set comprehension.enabled: false in openspec/config.yaml`;
