/**
 * Skill Template Workflow Modules — pre-apply artifact revision.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';
import {
  PROMPT_CLARIFY,
  PROMPT_SELECT_CHANGE_RECENT,
  TELEMETRY_MODIFY_GUIDANCE,
} from './user-prompt-guidance.js';

export function getModifyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-modify-change',
    description:
      'Revise planning artifacts before implementation. Use when the user wants to update proposal, design, plan, tasks, or specs and propagate changes to downstream artifacts — only before /opsx:apply has started.',
    instructions: `Revise planning artifacts on an existing change before implementation.

${STORE_SELECTION_GUIDANCE}

**Input**: Optionally specify change name, artifact to modify, and what to change. Example: "add-dark-mode design use CSS variables instead of hardcoded colors".

**Pre-apply only**: Do NOT use after /opsx:apply has started (any tasks checked off).

**Steps**

1. **Select the change and artifact**

   If not provided:
   - ${PROMPT_SELECT_CHANGE_RECENT}
   - Ask which artifact to modify: proposal, specs, design, plan, or tasks
   - ${PROMPT_CLARIFY} if the modify request is unclear

2. **Resolve scope and validate pre-apply**
   \`\`\`bash
   openspec instructions modify --change "<name>" --artifact "<id>" \\
     --workflow-input "<user request verbatim>" --editor cursor --json
   \`\`\`
   ${TELEMETRY_MODIFY_GUIDANCE}

   If the command fails because apply has started, stop and tell the user modify is pre-apply only.

3. **Confirm scope**

   Show source artifact, downstream artifacts, and full \`artifactsToUpdate\` list from JSON.
   Ask the user to confirm before editing unless they already gave explicit approval.

4. **Update artifacts in order**

   Loop through \`artifactsToUpdate\` from the modify JSON:

   a. Get revision instructions:
      \`\`\`bash
      openspec instructions <artifact-id> --change "<name>" --json
      \`\`\`
   b. Read the current file and upstream dependency artifacts
   c. Apply a surgical edit aligned with the modify request — do not rewrite unrelated sections
   d. Write to \`resolvedOutputPath\`
   e. For \`specs\`: add/remove/rename capability folders when proposal capabilities change

5. **Show final status**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`

**Output**

Summarize what changed, which artifacts were updated, and prompt: "Run \`/opsx:apply\` when ready to implement."

**Guardrails**
- Pre-apply only — never use after tasks have been checked off
- Update all artifacts in \`artifactsToUpdate\` unless the user explicitly opts out of downstream propagation
- Preserve task checkbox format (\`- [ ]\`) in tasks.md
- Do NOT skip calling \`openspec instructions\` before each artifact write (telemetry)`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxModifyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Modify',
    description: 'Revise planning artifacts before implementation and propagate to downstream artifacts',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: `Revise planning artifacts on an existing change before implementation.

${STORE_SELECTION_GUIDANCE}

**Input**: \`/opsx:modify [change-name] [artifact] <what to change>\`

Example: \`/opsx:modify add-dark-mode design use CSS variables instead of hardcoded colors\`

**Pre-apply only**: Do NOT use after \`/opsx:apply\` has started (any tasks checked off).

**Steps**

1. **Select the change and artifact**

   Parse change name and artifact from input, or prompt:
   - ${PROMPT_SELECT_CHANGE_RECENT}
   - Ask which artifact to modify if not specified
   - ${PROMPT_CLARIFY} if the modify request is unclear

2. **Resolve scope and validate pre-apply**
   \`\`\`bash
   openspec instructions modify --change "<name>" --artifact "<id>" \\
     --workflow-input "<user request verbatim>" --editor cursor --json
   \`\`\`
   ${TELEMETRY_MODIFY_GUIDANCE}

   If apply has started, stop — modify is pre-apply only.

3. **Confirm scope**

   Show source artifact, downstream list, and \`artifactsToUpdate\`. Confirm with user before editing.

4. **Update artifacts in order**

   For each ID in \`artifactsToUpdate\`:
   - \`openspec instructions <id> --change "<name>" --json\`
   - Read current file + upstream deps; apply surgical edit
   - Write to \`resolvedOutputPath\`
   - For \`specs\`: sync capability folders with proposal changes

5. **Final status**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`

**Output**

Summarize changes and prompt: "Run \`/opsx:apply\` when ready to implement."

**Guardrails**
- Pre-apply only
- Propagate to downstream artifacts unless user opts out
- Call \`openspec instructions\` before each write (telemetry)
- Hand off to \`/opsx:apply\`, not continued implementation`,
  };
}
