/**
 * Shared MCP guidance for Codewalla workflow templates.
 *
 * Interpolated into propose, apply, and verify workflows so generated
 * skills and slash commands consistently teach when to use Atlassian, Context7,
 * and Playwright MCP tools.
 */

export const ATLASSIAN_ENRICHMENT_GUIDANCE = `3.5. **Enrich from Jira (if ticket key available)**

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

   **If no ticket key found or Atlassian MCP unavailable:** Skip silently and continue.`;

export const ATLASSIAN_PROPOSE_GUIDANCE = `0. **Import from Jira (if a ticket key is provided)**

   If the user's input contains or is a Jira issue key (e.g., "CW-1234" or "CW-1234 add dark mode"):

   Use the **Atlassian MCP** to fetch the issue:
   - summary → becomes the change name candidate (kebab-case it)
   - description → seed for proposal.md "Why" and "What Changes" sections
   - acceptance criteria → seed for specs artifact requirements
   - parent epic → context for the "Impact" section of the proposal

   Walk the parent chain:
   - Fetch the epic (or story parent) for business-level framing
   - Include the epic goal as opening context in the proposal

   After fetching, proceed to step 1 using the ticket data as pre-filled input.
   Tell the user: "Found CW-1234: '<summary>'. Creating change from Jira ticket."

   **Naming conventions** (Jira tracks work; specs track behavior):

   - **Change name**: kebab-case summary; optionally prefix with lowercase ticket key
     (e.g., \`cw-1234-add-dark-mode\`). Never use the ticket key alone as the change name.
   - **Capabilities** (proposal + delta specs): pick domain names from existing
     \`openspec/specs/\` or derive from behavior (\`ui\`, \`auth\`). **Do NOT** name
     capabilities or spec folders after the Jira key.
   - **Acceptance criteria**: map each AC to requirements/scenarios inside the
     appropriate capability spec—not to a ticket-named spec file.
   - **Traceability**: record ticket key(s) in proposal **Impact**
     (e.g., \`Jira: CW-1234\` or \`Jira: CW-100 (epic), CW-1234 (story)\`).
   - **Follow-up work**: when continuing or splitting ticket work, create a new change
     folder with a distinct name; reference the same or related tickets in Impact.
     Do not reuse archived change folders or ticket-key spec folders.

   **If no ticket key:** proceed normally from step 1.`;

export const CONTEXT7_LOOKUP_GUIDANCE = `   **Before implementing each task — library check:**

   If the task description references a specific library, framework, or package
   (e.g., "implement with Prisma", "add React Query cache", "use Drizzle ORM transactions",
   "migrate to Next.js App Router", "use tRPC v11 procedure"):

   1. Call \`resolve-library-id\` (Context7 MCP) with the library name to get its Context7 ID
   2. Call \`query-docs\` with the Context7 ID and the specific question from the task
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

   **Cap:** Do not call Context7 more than 3 times per apply session.`;

export const PLAYWRIGHT_APPLY_GUARDRAIL = `- Do NOT run Playwright or browser tests during apply. If the user explicitly asks to also "run tests", "verify UI", or "check in browser" in the same message, complete all tasks first, then invoke openspec-verify-change (or \`/opsx:verify\`) to handle browser verification — do not do it inline during apply`;

export const PLAYWRIGHT_VERIFY_GUIDANCE = `8. **Browser verification (Playwright)**

   After codebase analysis (steps 5–7), assess if the change touches UI or web pages:
   - proposal.md or tasks.md mentions pages, components, screens, UI, CSS, visual, layout

   **If yes, use the Playwright MCP:**

   **a. Check for a running dev server**
   - Scan package.json \`scripts\` for: \`dev\`, \`start\`, \`preview\`, \`serve\`
   - Check if localhost is reachable (common ports: 3000, 3001, 5173, 8080)
   - If a URL is available, announce it. If not, note "No dev server detected — skipping visual verification."

   **b. If dev server is reachable:**
   - Use \`browser_navigate\` to open the affected page(s) identified from the change
   - Use \`browser_take_screenshot\` to capture the current visual state
   - Use \`browser_snapshot\` to get the accessibility tree and verify key elements
   - Use \`browser_console_messages\` to check for JS errors introduced by this change
   - If network requests are relevant: \`browser_network_requests\` to spot regressions

   **c. Playwright test files**
   Search the project for:
   - \`**/*.spec.ts\`, \`**/*.e2e.ts\`, \`**/playwright/**/*.ts\`, \`**/e2e/**/*.ts\`
   If test files related to the changed pages/components are found:
   - List them
   - If the user asks you to run them, execute and report pass/fail inline

   **If no dev server is reachable:**
   Add a SUGGESTION to the report: "Start dev server and re-run /opsx:verify for visual confirmation."

   Include browser results in the verification report (step 9).`;
