<p align="center">
  <a href="https://github.com/codewalla-engineering/OpenSpec">
    <picture>
      <source srcset="assets/codewalla_bg.png">
      <img src="assets/codewalla_bg.png" alt="Codewalla OpenSpec" width="100%">
    </picture>
  </a>
</p>

<p align="center"><strong>Codewalla OpenSpec — spec-driven development for AI coding assistants</strong></p>

<p align="center">
  <a href="https://github.com/codewalla-engineering/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/codewalla-engineering/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@codewalla_india/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@codewalla_india/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
</p>

> [!TIP]
> **Codewalla workflow:** Propose from a Jira ticket or plain description, revise with `/opsx:modify`, then apply.
>
> Run `/opsx:propose CW-1234 add dark mode` or `/opsx:propose "your idea"` to get started.
> → [Jira integration](docs/workflows.md#jira-integration) · [MCP setup](docs/mcp-setup.md)

<!-- TODO: Add GIF demo of /opsx:propose → /opsx:archive workflow -->

## See it in action

```text
You: /opsx:explore
AI:  What would you like to explore?
You: I want dark mode but I'm not sure how to do it cleanly.
AI:  Let me look at your styling setup...
     Cleanest path here: CSS variables + a small theme context,
     with system-preference detection. No new dependencies. Scope it?
You: Yes, let's do it.

You: /opsx:propose CW-1234 add-dark-mode
AI:  Found CW-1234: 'Add dark mode'. Creating change from Jira ticket...
     ✓ proposal.md  (Impact: Jira: CW-1234)
     ✓ specs/ui/    (requirements from Jira ACs)
     ✓ design.md    — technical approach
     ✓ plan.md      — file-level code map
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /opsx:modify add-dark-mode design use CSS variables instead of hardcoded colors
AI:  Updated design.md → propagated to plan.md and tasks.md
     Run /opsx:apply when ready.

You: /opsx:apply
AI:  Jira context: CW-1234 — all ACs covered ✓
     Comprehension check — 7 questions on proposal, design, specs, plan, and tasks...
     ✓ 86% — ready to implement.
     Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /opsx:archive
AI:  Archived to openspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

## Quick Start

**Requires Node.js 20.19.0 or higher.**

Install OpenSpec globally:

```bash
npm install -g @codewalla_india/openspec@latest
```

Then navigate to your project directory and initialize:

```bash
cd your-project
openspec init
```

> [!NOTE]
> **Codewalla identity:** `openspec init` prompts for your Codewalla email or username. All commands require telemetry identity. CI runners should pre-provision `~/.config/openspec/telemetry-identity.json` or set `OPENSPEC_TELEMETRY_USER`.

Now talk to your AI:

- **Not sure what you want to build yet?** Start with `/opsx:explore`, a no-stakes thinking partner that reads your code, weighs options, and shapes a plan before anything is written. ([Explore guide](docs/explore.md))
- **Already know what you want?** Go straight to `/opsx:propose <what-you-want-to-build>` or `/opsx:propose CW-1234 <summary>` to import from Jira.
- **Need to revise the plan before coding?** Run `/opsx:modify` — pre-apply only; propagates changes to downstream artifacts. ([Editing a change](docs/editing-changes.md))
- **Ready to implement?** Run `/opsx:apply` — a short comprehension quiz checks you understand the proposal, design, specs, plan, and tasks before any code is written.

The default `core` profile includes `/opsx:explore`, `/opsx:propose`, `/opsx:modify`, `/opsx:apply`, `/opsx:sync`, and `/opsx:archive`. If you want the expanded workflow (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:bulk-archive`, `/opsx:onboard`), select it with `openspec config profile` and apply with `openspec update`.

> [!NOTE]
> Not sure if your tool is supported? [View the full list](docs/supported-tools.md) – we support 25+ tools and growing.
>
> Also works with pnpm, yarn, bun, and nix. [See installation options](docs/installation.md).

## Codewalla workflow & MCPs

OpenSpec workflows integrate with MCP servers in your AI tool. MCPs are optional — workflows degrade gracefully when a server is unavailable.

| MCP | Workflow | Behavior |
|-----|----------|----------|
| **Atlassian** | `/opsx:propose`, `/opsx:apply` | Import Jira tickets; enrich and cross-check ACs vs tasks; skips if unavailable |
| **Context7** | `/opsx:apply` | Fetch current library docs when tasks reference packages; max 3 calls per session |
| **Browser** | `/opsx:verify` (expanded profile) | Screenshots, a11y snapshot, console errors; not run during apply |

→ **[MCP Setup guide](docs/mcp-setup.md)** — enable servers in Cursor or your AI tool<br>
→ **[Jira integration](docs/workflows.md#jira-integration)** — naming conventions and ticket flows

## Docs

**Start here:** the **[Documentation Home](docs/README.md)** maps everything. New to OpenSpec? Read [Getting Started](docs/getting-started.md), then [How Commands Work](docs/how-commands-work.md) (where you actually type `/opsx:propose`).

→ **[Getting Started](docs/getting-started.md)**: first steps<br>
→ **[Explore First](docs/explore.md)**: think it through with `/opsx:explore` before you commit<br>
→ **[How Commands Work](docs/how-commands-work.md)**: where slash commands run vs the CLI<br>
→ **[Core Concepts at a Glance](docs/overview.md)**: the whole mental model, one page<br>
→ **[Examples & Recipes](docs/examples.md)**: real changes, start to finish<br>
→ **[Workflows](docs/workflows.md)**: combos and patterns<br>
→ **[MCP Setup](docs/mcp-setup.md)**: Atlassian, Context7, and browser MCPs<br>
→ **[Existing Projects](docs/existing-projects.md)**: adopt OpenSpec on a brownfield codebase<br>
→ **[Editing a Change](docs/editing-changes.md)**: update artifacts, go back, reconcile manual edits<br>
→ **[Commands](docs/commands.md)**: slash commands & skills<br>
→ **[CLI](docs/cli.md)**: terminal reference<br>
→ **[Stores](docs/stores-beta/user-guide.md)**: plan in a separate repo, shared across your team (beta)<br>
→ **[Supported Tools](docs/supported-tools.md)**: tool integrations & install paths<br>
→ **[Concepts](docs/concepts.md)**: how it all fits<br>
→ **[Multi-Language](docs/multi-language.md)**: multi-language support<br>
→ **[Customization](docs/customization.md)**: make it yours<br>
→ **[FAQ](docs/faq.md)** · **[Troubleshooting](docs/troubleshooting.md)** · **[Glossary](docs/glossary.md)**: quick help


## Community schemas

Third-party schema bundles distributed via standalone repositories — these provide opinionated workflows that integrate OpenSpec with other tools, similar to how [github/spec-kit's community extension catalog](https://github.com/github/spec-kit/tree/main/extensions) handles tool integrations.

→ **[Browse the catalog](docs/customization.md#community-schemas)** in the customization docs.


## Why OpenSpec?

AI coding assistants are powerful but unpredictable when requirements live only in chat history. OpenSpec adds a lightweight spec layer so you agree on what to build before any code is written.

- **Agree before you build** — human and AI align on specs before code gets written
- **Stay organized** — each change gets its own folder with proposal, specs, design, plan, and tasks
- **Work fluidly** — update any artifact anytime with `/opsx:modify`; no rigid phase gates
- **Jira-native workflow** — propose from ticket keys, enrich from Jira during apply, traceability in proposal Impact
- **MCP-powered** — Atlassian, Context7, and browser MCPs built into generated skills
- **Use your tools** — works with 20+ AI assistants via slash commands

## Updating OpenSpec

**Upgrade the package**

```bash
npm install -g @codewalla_india/openspec@latest
```

**Refresh agent instructions**

Run this inside each project to regenerate AI guidance and ensure the latest slash commands and MCP guidance are active:

```bash
openspec update
```

## Usage Notes

**Context hygiene**: OpenSpec benefits from a clean context window. Clear your context before starting implementation and maintain good context hygiene throughout your session.

**Modify before apply**: `/opsx:modify` revises planning artifacts and propagates changes downstream. It is pre-apply only — once tasks are checked off in `/opsx:apply`, use manual edits or start a new change.

**Comprehension check**: `/opsx:apply` runs a short quiz (enabled by default) on proposal, design, specs, plan, and pending tasks before implementation. Questions test holistic understanding of the change, not task numbers or checklist trivia; plan receives the majority of questions when present. You need ≥ 80% to proceed. Disable with `comprehension.enabled: false` in `openspec/config.yaml`. See [Workflows](docs/workflows.md#comprehension-quiz-before-apply).

## Other

<details>
<summary><strong>Telemetry</strong></summary>

Codewalla OpenSpec collects mandatory usage analytics tied to your email or username. Identity is collected during interactive `openspec init` or `openspec update` and stored at `~/.config/openspec/telemetry-identity.json` (never committed). All other commands require identity. CI runners should pre-provision that file or set `OPENSPEC_TELEMETRY_USER`.

Events include command names, workflow metrics, change names, workflow input text (via `--workflow-input` on `new change`), and modify requests (`artifact_modify_requested` with modify input) — not file paths or artifact/spec body content.

</details>

## License

MIT
