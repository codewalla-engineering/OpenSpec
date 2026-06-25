## Why

Teams often run `/opsx:apply` without reading delta specs, implementing from tasks alone and missing requirements and scenarios. A comprehension quiz inside apply forces engagement with specs before any code changes.

## What Changes

- Default-on comprehension gate before apply (`comprehension.enabled: false` to disable)
- `openspec instructions apply` returns `state: blocked` until quiz pass is recorded
- Multiple-choice quiz runs inside `/opsx:apply` (5–10 questions scaled to spec size, ≥80% to pass)
- `--record-comprehension-pass` on `instructions apply` writes pass file after successful quiz
- Pass invalidates when delta specs change (fingerprint)

## Capabilities

### Modified Capabilities

- `cli-artifact-workflow`: Apply instructions comprehension gate and record-pass flags

## Impact

- `src/core/comprehension/` — gate logic
- `src/commands/workflow/instructions.ts` — apply gate + record pass
- `src/core/templates/workflows/apply-change.ts` — quiz guidance in apply skill
- `docs/agent-contract.md`, `docs/workflows.md`, `docs/customization.md`
