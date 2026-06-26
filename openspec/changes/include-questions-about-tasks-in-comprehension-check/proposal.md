## Why

The apply comprehension quiz already covers delta specs and pending tasks, but agents often treat task questions as checklist trivia (task order, numbering, or verbatim checkbox text) instead of verifying they understand the change holistically. Proposal motivation and design decisions are barely tested—`design.md` is read only for distractors—so an agent can pass without grasping why the change exists or how it should be built.

## What Changes

- Expand comprehension quiz sources to include `proposal.md` and `design.md` as first-class question material (not distractors-only for design)
- Reframe task-based questions to test conceptual understanding of the implementation plan: scope, approach, dependencies, and alignment with proposal/design—never task numbers, checklist order, or "which task says X verbatim"
- Require balanced coverage across available artifacts when present: at least one question each from proposal, design, specs/scenarios, and pending tasks (when each exists)
- Update shared apply guidance template (`comprehension-guidance.ts`) and regenerated apply skill/command files
- Align user-facing docs (`workflows.md`, `customization.md`, `agent-contract.md`) with the broader quiz scope

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `cli-artifact-workflow`: Apply comprehension quiz agent guidance covers proposal, design, specs, and conceptual task understanding (not task numbering)
- `docs-agent-instructions`: Document the expanded quiz scope and question-quality rules in agent-facing workflow docs

## Impact

- `src/core/templates/workflows/comprehension-guidance.ts` — primary quiz generation rules
- `src/core/templates/workflows/apply-change.ts` — consumes shared guidance (regenerate via `openspec update` or equivalent)
- `.cursor/skills/openspec-apply-change/SKILL.md`, `.cursor/commands/opsx-apply.md`, and Windsurf mirrors
- `docs/workflows.md`, `docs/customization.md`, `docs/agent-contract.md`
- `src/commands/workflow/instructions.ts` — blocked-state instruction text may mention proposal/design coverage
