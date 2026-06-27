# MCP Setup

Codewalla OpenSpec workflows integrate with MCP (Model Context Protocol) servers in your AI coding assistant. MCPs extend what agents can do during propose, apply, and verify — fetch Jira tickets, look up library docs, and verify UI in a browser.

**MCPs are optional.** Workflows degrade gracefully when a server is unavailable or not configured. The only hard requirement is Codewalla telemetry identity for CLI commands (see [FAQ: Does OpenSpec collect data?](faq.md#does-openspec-collect-data)).

For Jira naming conventions and ticket flows, see [Workflows: Jira integration](workflows.md#jira-integration).

## Overview

| MCP | Used in | Purpose |
|-----|---------|---------|
| **Atlassian** | `/opsx:propose`, `/opsx:apply` | Import Jira tickets; enrich and cross-check acceptance criteria |
| **Context7** | `/opsx:apply` | Fetch up-to-date library documentation |
| **Browser** | `/opsx:verify` | Visual verification via dev server (expanded profile only) |

Enable MCP servers in your AI tool's MCP settings (e.g., Cursor → Settings → MCP). Authentication is handled by each server — connect to Jira Cloud for Atlassian, sign in or configure API access for Context7, and enable the browser server for Playwright-style verification.

After enabling MCPs, run `openspec update` in your project so generated skills and slash commands include the latest MCP guidance.

## Atlassian MCP

### What it does

**During `/opsx:propose`** — when your input contains a Jira issue key (e.g., `CW-1234` or `CW-1234 add dark mode`):

- Fetches summary, description, acceptance criteria, and parent epic
- Seeds proposal.md, specs, and Impact section
- Suggests a kebab-case change name (optionally prefixed with ticket key)

**During `/opsx:apply`** — when a ticket key appears in the change name, proposal.md, or design.md:

- Fetches the issue, parent hierarchy, and recent comments
- Cross-checks Jira acceptance criteria against tasks.md
- Prints a "Jira Context" section before implementation
- Pauses if scope-change comments conflict with the plan

**If no ticket key is found or Atlassian MCP is unavailable:** the workflow skips Jira steps silently and continues.

### Naming conventions

Jira tracks work; specs track behavior:

| Layer | Naming | Example |
|-------|--------|---------|
| Change folder | Optional ticket prefix + summary (kebab-case) | `cw-1234-add-dark-mode` |
| Proposal Impact | Ticket key for traceability | `Jira: CW-1234` |
| Spec capability | Behavioral domain only | `ui`, `user-auth` |

Do **not** name spec folders after ticket keys (e.g., `specs/cw-1234/`).

### Setup

1. Enable the **Atlassian MCP** server in your AI tool
2. Authenticate to your Jira Cloud instance
3. Run `openspec update` in your project
4. Test: `/opsx:propose CW-1234 <summary>` (replace with a real ticket key)

## Context7 MCP

### What it does

**During `/opsx:apply`** — before implementing a task that references a specific library, framework, or package:

1. Call `resolve-library-id` with the library name to get its Context7 ID
2. Call `query-docs` with the ID and a specific question from the task
3. Use the returned documentation to guide implementation

**Triggers when:**

- A task mentions a package by name (e.g., "implement with Prisma", "use Drizzle ORM transactions")
- A task uses version-specific language ("v5 API", "new hook syntax")
- A task involves migration between library versions
- package.json shows a recently updated dependency relevant to the task

**Skips when:**

- The task is purely business logic (no library API involved)
- Docs for the same library were already fetched earlier in the session

**Cap:** Do not call Context7 more than 3 times per apply session.

### Setup

1. Enable the **Context7 MCP** server in your AI tool
2. Configure authentication if required by your Context7 setup
3. Run `openspec update` in your project

No configuration inside OpenSpec itself — the agent decides when to call Context7 based on task content.

## Browser MCP (Playwright)

### What it does

**During `/opsx:verify` only** — after codebase analysis, if the change touches UI or web pages:

1. Checks for a running dev server (package.json scripts, common ports)
2. Navigates to affected pages with `browser_navigate`
3. Captures screenshots with `browser_take_screenshot`
4. Gets the accessibility tree with `browser_snapshot`
5. Checks for JS errors with `browser_console_messages`
6. Optionally inspects network requests with `browser_network_requests`

**During `/opsx:apply`:** browser tests are explicitly **not** run. If the user asks to verify UI during apply, the agent completes tasks first, then hands off to `/opsx:verify`.

**If no dev server is reachable:** verify adds a suggestion to start the dev server and re-run `/opsx:verify`.

### Setup

1. Enable verify in your workflow profile:
   ```bash
   openspec config profile   # select verify among expanded workflows
   openspec update
   ```
2. Enable the **browser MCP** server in your AI tool (e.g., cursor-ide-browser)
3. Ensure your project's dev server is running when you run `/opsx:verify` on UI changes

## Workflow command matrix

| Command | Atlassian | Context7 | Browser |
|---------|-----------|----------|---------|
| `/opsx:propose` | Import ticket (if key provided) | — | — |
| `/opsx:modify` | — | — | — |
| `/opsx:apply` | Enrich + AC cross-check (if key found) | Library docs (if task references packages) | — (explicitly blocked) |
| `/opsx:verify` | — | — | UI verification (if change touches UI) |

## Troubleshooting

### Jira ticket not imported during propose

- Confirm the Atlassian MCP is enabled and authenticated
- Check that your input includes a valid issue key (e.g., `CW-1234`)
- Without Atlassian MCP, propose works normally from plain-language input

### No Jira context during apply

- Ensure a ticket key appears in the change name, proposal.md, or design.md
- Atlassian MCP must be available; otherwise apply skips enrichment silently

### Context7 not called during apply

- Context7 only triggers when tasks reference specific libraries or packages
- Pure business-logic tasks skip the lookup
- The 3-call cap may have been reached for the session

### Browser verification skipped during verify

- `/opsx:verify` requires the expanded profile (`openspec config profile` → enable verify)
- A dev server must be running on a reachable localhost port
- Browser MCP must be enabled in your AI tool
- Verify notes "No dev server detected" and suggests starting one

### MCP guidance not appearing in agent behavior

Run `openspec update` in your project after enabling MCP servers. Generated skills and slash commands embed MCP guidance from the latest OpenSpec version.

## Next steps

- [Workflows: Jira integration](workflows.md#jira-integration) — ticket flows and parallel changes
- [Commands: /opsx:verify](commands.md) — verification dimensions and browser checks
- [Getting Started](getting-started.md) — full workflow from install to archive
