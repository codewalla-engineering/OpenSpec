---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.0.0"
---

Implement tasks from an OpenSpec change.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx:apply <other>`).

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - `planningHome`, `changeRoot`, and `actionContext`: planning scope and edit constraints
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - `contextFiles`: artifact ID -> array of concrete file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` and `missingArtifacts`: show message, suggest using openspec-continue-change
   - If `state: "blocked"` and `missingComprehension`: proceed to step 4 (comprehension quiz) — do NOT implement
   - If `state: "all_done"`: congratulate, suggest archive
   - If `state: "ready"`: proceed to step 5

3.5. **Enrich from Jira (if ticket key available)**

   Scan the change name, proposal.md, and design.md for a Jira issue key
   (pattern: one or more capital letters, a dash, one or more digits — e.g., CW-123, PROJ-456).

   If a ticket key is found, use the **Atlassian MCP**:

   **a. Fetch the issue**
   - Retrieve: summary, description, issue type, status, labels
   - Extract any "Acceptance Criteria" section from the description
   - Note the assignee and reporter

   **b. Walk the parent hierarchy**
   - If the issue has a parent (sub-task → story, or story → epic):
     - Fetch the parent ticket for business goal context
     - If parent has a parent (epic), fetch that too for initiative framing
     - Note the full path: Initiative → Epic → Story → Sub-task

   **c. Fetch recent comments**
   - Get comments, ordered by date
   - Look for scope reduction ("out of scope", "defer X"), changed approach,
     blocker resolutions, or QA/review feedback added after planning

   **d. Cross-check against tasks.md**
   - For each acceptance criterion in Jira: verify at least one task covers it
   - If an AC has no corresponding task → add it to the flagged list
   - For any comment that changed scope post-planning → note the discrepancy

   **Output:** Print a "Jira Context" section showing:
   - Ticket key + summary, type, status
   - Parent chain (if any)
   - ACs: covered ✓ / not covered ✗
   - Scope-change comments (if any, with date)
   - "Proceeding with implementation" or "⚠ Pausing — scope mismatch found, confirm before continuing"

   **If no ticket key found or Atlassian MCP unavailable:** Skip silently and continue.

4. **Comprehension quiz (required before implementation)**

   After `openspec instructions apply --change "<name>" --json`, check comprehension status:

   - If `missingComprehension` is true OR `comprehension.required && !comprehension.passed`:
     - Do NOT edit application source code or mark task checkboxes yet
     - Read `contextFiles.specs`, `contextFiles.tasks` (or the `tasks` array in apply JSON), and `contextFiles.design` (design for distractors only)
     - Use `comprehension.questionCount` from the JSON as the number of questions

   **Generate questions**
   - Create exactly `comprehension.questionCount` multiple-choice questions
   - Each question MUST map to one of:
     - a `### Requirement:` or `#### Scenario:` from delta specs, OR
     - a pending (unchecked) task from `tasks.md` / the apply `tasks` array
   - When both specs and pending tasks exist, include at least 2 task-based questions and cover the rest from specs/scenarios
   - Do NOT use completed tasks as question sources
   - Each question: 4 options (1 correct from the source item, 3 plausible distractors from other requirements/scenarios/tasks in the change)

   **Present and grade**
   - Use the **AskUserQuestion tool** for each question (one at a time)
   - Grade: `score_percent = round(correct / question_count * 100)`
   - Pass when `score_percent >= comprehension.thresholdPercent` (default 80)

   **On failure (score below threshold)**
   - Announce score and that a new quiz is required
   - Update `.comprehension-session.yaml` in the change dir with `used_sources` from this attempt
   - Generate a NEW question set using different requirement/scenario/task sources (avoid `used_sources`)
   - Retry until pass

   **On pass**
   ```bash
   openspec instructions apply --change "<name>" --record-comprehension-pass --score <score> --attempt <n> --question-count <count> --json
   ```
   - Re-run `openspec instructions apply --change "<name>" --json`
   - Confirm `state` is `"ready"` and `comprehension.passed` is true before continuing

   **Output template**
   ```
   ## Applying: <change-name> — comprehension check

   Specs: <requirementCount> requirements, <scenarioCount> scenarios; Tasks: <pendingTaskCount> pending → <questionCount> questions

   Question 1/N: ...
   ...
   ✓ Comprehension passed (<score>%, attempt <n>)
   ```

   Then continue to step 5 (show progress) and implementation.

5. **Read context files**

   After comprehension is passed (or not required), read every file path listed under `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

6. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

7. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on

   **Before implementing each task — library check:**

   If the task description references a specific library, framework, or package
   (e.g., "implement with Prisma", "add React Query cache", "use Drizzle ORM transactions",
   "migrate to Next.js App Router", "use tRPC v11 procedure"):

   1. Call `resolve-library-id` (Context7 MCP) with the library name to get its Context7 ID
   2. Call `query-docs` with the Context7 ID and the specific question from the task
      — e.g., "How to use transactions with Drizzle ORM 0.38?"
   3. Use the returned documentation to guide the implementation

   **When to trigger this check:**
   - Task mentions a package by name
   - Task uses version-specific language ("v5 API", "new hook syntax")
   - Task involves migration between library versions
   - The codebase's package.json shows a recently updated dependency relevant to the task

   **When to skip:**
   - Task is purely business logic (no library API involved)
   - You already fetched docs for this library in a previous task this session
     (reuse the earlier result, don't call again)

   **Cap:** Do not call Context7 more than 3 times per apply session.

   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

8. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: suggest archive
   - If paused: explain why and wait for guidance

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Ready to archive this change.
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names
- NEVER implement code or mark tasks while `missingComprehension` is true
- NEVER skip the comprehension quiz when the apply JSON requires it
- If the user asks to skip the quiz, refuse and explain they must pass or set comprehension.enabled: false in openspec/config.yaml
- Do NOT run Playwright or browser tests during apply. If the user explicitly asks to also "run tests", "verify UI", or "check in browser" in the same message, complete all tasks first, then invoke openspec-verify-change (or `/opsx:verify`) to handle browser verification — do not do it inline during apply

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
