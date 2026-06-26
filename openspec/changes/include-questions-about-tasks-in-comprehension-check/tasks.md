## 1. Comprehension guidance template

- [x] 1.1 Update `src/core/templates/workflows/comprehension-guidance.ts` to read `contextFiles.proposal`, `contextFiles.design`, `contextFiles.specs`, and `contextFiles.tasks` as question sources
- [x] 1.2 Add minimum-one-per-category coverage when proposal, design, specs, and pending tasks all exist
- [x] 1.3 Reframe task questions to test scope, approach, dependencies, and alignment—not task numbers, order, or verbatim checkbox text
- [x] 1.4 Add explicit forbidden question patterns and good/bad examples to the guidance
- [x] 1.5 Update comprehension quiz output template to mention proposal/design coverage

## 2. Apply instructions text

- [x] 2.1 Update blocked-state instruction in `src/commands/workflow/instructions.ts` to reference proposal, design, specs, and tasks (not "specs and tasks" only)

## 3. Regenerate apply skill and commands

- [x] 3.1 Regenerate or sync `.cursor/skills/openspec-apply-change/SKILL.md` from apply-change template
- [x] 3.2 Regenerate or sync `.cursor/commands/opsx-apply.md` from apply-change template
- [x] 3.3 Regenerate or sync `.windsurf/skills/openspec-apply-change/SKILL.md` and `.windsurf/workflows/opsx-apply.md`

## 4. Documentation

- [x] 4.1 Update `docs/workflows.md` comprehension quiz section for multi-artifact scope and conceptual task questions
- [x] 4.2 Update `docs/customization.md` comprehension quiz description
- [x] 4.3 Update `docs/agent-contract.md` if apply instruction wording references quiz scope

## 5. Verification

- [x] 5.1 Run `openspec validate --change include-questions-about-tasks-in-comprehension-check`
- [x] 5.2 Confirm generated apply files contain updated comprehension guidance (grep for proposal/design coverage and task-number prohibition)
