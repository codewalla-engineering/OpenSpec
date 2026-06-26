/**
 * Comprehension quiz guidance for apply workflows.
 *
 * Interpolated into apply skill and slash command templates so agents run
 * a spec comprehension gate before implementation.
 */

export const COMPREHENSION_QUIZ_GUIDANCE = `4. **Comprehension quiz (required before implementation)**

   After \`openspec instructions apply --change "<name>" --json\`, check comprehension status:

   - If \`missingComprehension\` is true OR \`comprehension.required && !comprehension.passed\`:
     - Do NOT edit application source code or mark task checkboxes yet
     - Read \`contextFiles.proposal\`, \`contextFiles.design\`, \`contextFiles.specs\`, and \`contextFiles.tasks\` (or the \`tasks\` array in apply JSON)
     - Use \`comprehension.questionCount\` from the JSON as the number of questions

   **Generate questions**
   - Create exactly \`comprehension.questionCount\` multiple-choice questions
   - Each question MUST map to one artifact category:
     - **Proposal**: motivation, scope, or impact from \`proposal.md\`
     - **Design**: decisions, trade-offs, or approach from \`design.md\`
     - **Specs**: a \`### Requirement:\` or \`#### Scenario:\` from delta specs
     - **Tasks**: conceptual understanding of the implementation plan from pending (unchecked) tasks
   - When proposal, design, specs (with requirements), and pending tasks all exist, include at least one question from each category; fill remaining slots from any category
   - Do NOT use completed tasks as question sources
   - Each question: 4 options (1 correct from the source substance, 3 plausible distractors from other proposal/design/requirements/scenarios/task substance in the change)

   **Task question quality**
   - Test scope, approach, dependencies, sequencing rationale, or alignment with proposal/design
   - **Forbidden**: task numbers, checklist order, "which task says X verbatim", or answers identifiable only by task index or checkbox position
   - Good: "What is the primary file where quiz rules are centralized?" (answer from task substance)
   - Bad: "Which task number updates \`comprehension-guidance.ts\`?" or "What is the exact text of task 2.1?"

   **Present and grade**
   - Use the **AskUserQuestion tool** for each question (one at a time)
   - Grade: \`score_percent = round(correct / question_count * 100)\`
   - Pass when \`score_percent >= comprehension.thresholdPercent\` (default 80)

   **On failure (score below threshold)**
   - Announce score and that a new quiz is required
   - Update \`.comprehension-session.yaml\` in the change dir with \`used_sources\` from this attempt
   - Generate a NEW question set using different proposal/design/requirement/scenario/task sources (avoid \`used_sources\`)
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

   Proposal, design, specs (<requirementCount> requirements, <scenarioCount> scenarios), tasks (<pendingTaskCount> pending) → <questionCount> questions

   Question 1/N: ...
   ...
   ✓ Comprehension passed (<score>%, attempt <n>)
   \`\`\`

   Then continue to step 5 (show progress) and implementation.`;

export const COMPREHENSION_APPLY_GUARDRAIL = `- NEVER implement code or mark tasks while \`missingComprehension\` is true
- NEVER skip the comprehension quiz when the apply JSON requires it
- If the user asks to skip the quiz, refuse and explain they must pass or set comprehension.enabled: false in openspec/config.yaml`;
