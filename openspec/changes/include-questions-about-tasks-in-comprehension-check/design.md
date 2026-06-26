## Context

Apply comprehension quiz rules live in a single shared template (`src/core/templates/workflows/comprehension-guidance.ts`) interpolated into apply skill/command generators. Today it maps questions to delta spec requirements/scenarios or pending task lines, uses `design.md` only for distractors, and does not read `proposal.md` at all. Agents therefore pass quizzes without demonstrating they understand motivation, design trade-offs, or the implementation plan as a whole.

## Goals / Non-Goals

**Goals:**

- Expand quiz sources to proposal, design, specs/scenarios, and pending tasks
- Require task questions to test conceptual implementation understanding (scope, approach, dependencies, alignment)—never task numbers or verbatim checkbox text
- Keep balanced minimum coverage when all artifact types exist
- Update user-facing docs to match

**Non-Goals:**

- Changing comprehension gate mechanics (threshold, fingerprint, pass recording, question count scaling)
- Adding CLI flags or new config knobs for quiz composition
- Auto-generating quiz questions in the CLI (still agent-driven via AskUserQuestion)

## Decisions

### 1. Centralize rule changes in `comprehension-guidance.ts`

**Choice:** Edit the shared constant only; apply skill/command templates pick it up via `apply-change.ts`.

**Rationale:** One source of truth avoids drift between Cursor, Windsurf, and future tool outputs. Matches how comprehension was originally added.

**Alternatives considered:** Duplicate edits in each `.cursor`/`.windsurf` file — rejected because `openspec update` would overwrite manual edits.

### 2. Four artifact categories with minimum coverage

**Choice:** When proposal, design, specs (with requirements), and pending tasks all exist, require at least one question from each category; fill remaining slots from any category.

**Rationale:** Ensures holistic understanding without forcing equal splits for small changes. Question count still scales via existing `comprehension.questionCount`.

### 3. Explicit prohibitions for task trivia

**Choice:** Document forbidden patterns inline in guidance: no task numbers, no checklist order, no "which task says X verbatim."

**Rationale:** Agents default to literal matching when told to map questions to task lines. Positive framing ("test scope, approach, dependencies") plus explicit bans reduces bad questions.

**Example good task question:** "What is the primary integration point for recording comprehension passes?" (answer from task substance)

**Example bad task question:** "Which task number updates `comprehension-guidance.ts`?" or "What is the exact text of task 2.1?"

### 4. Proposal and design as peer sources

**Choice:** Read `contextFiles.proposal` and `contextFiles.design` alongside specs/tasks. Design contributes both questions and distractors.

**Rationale:** Proposal "Why/What Changes" and design "Decisions" are the highest-signal content for pre-implementation understanding.

### 5. Update blocked instruction string

**Choice:** Change apply blocked message from "specs and tasks" to "change artifacts" or enumerate proposal, design, specs, and tasks.

**Rationale:** Instruction text should match actual quiz scope (`src/commands/workflow/instructions.ts` line ~449).

## Risks / Trade-offs

- **[Risk] Agents still write trivia questions** → Mitigation: explicit forbidden patterns and good/bad examples in guidance; docs reinforce the rule
- **[Risk] Small changes with thin proposal/design get forced questions** → Mitigation: minimum-one-per-category only when the artifact exists *and* has substantive content; skip empty sections
- **[Risk] Regenerated skill files out of sync** → Mitigation: tasks include running template generation / `openspec update` for affected tools

## Migration Plan

1. Update `comprehension-guidance.ts` with new read list, coverage rules, and task question framing
2. Update apply blocked instruction text in `instructions.ts`
3. Regenerate or manually sync apply skill/command files from templates
4. Update `docs/workflows.md`, `docs/customization.md`, `docs/agent-contract.md`

No user migration required; behavior change is agent-guidance only.

## Open Questions

- None — scope is guidance-only with no new config surface.
