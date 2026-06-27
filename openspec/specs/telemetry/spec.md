# telemetry Specification

## Purpose

This spec defines how Codewalla OpenSpec collects mandatory usage telemetry to understand workflow adoption and completion. It governs the `src/telemetry/` module: PostHog integration, identified-user event design, workflow funnel metrics, and identity gating. Telemetry identity is required for all commands except bootstrap; there is no opt-out.

## Requirements

### Requirement: Command execution tracking
The system SHALL send a `command_executed` event to PostHog when any CLI command executes with a configured identity, including the command name and OpenSpec version as properties.

#### Scenario: Standard command execution
- **WHEN** a user runs any openspec command with a configured identity
- **THEN** the system sends a `command_executed` event with `command` and `version` properties

#### Scenario: Subcommand execution
- **WHEN** a user runs a nested command like `openspec change apply`
- **THEN** the system sends a `command_executed` event with the full command path (e.g., `change:apply`)

#### Scenario: Instructions artifact path
- **WHEN** a user runs `openspec instructions proposal` or `openspec instructions apply`
- **THEN** the system sends a `command_executed` event with `command` set to `instructions:proposal` or `instructions:apply` respectively

#### Scenario: Instructions record pass path
- **WHEN** a user runs `openspec instructions apply --record-comprehension-pass`
- **THEN** the system sends a `command_executed` event with `command` set to `instructions:apply:record_pass`

#### Scenario: Command context from flags
- **WHEN** a user runs a command with `--change <id>`
- **THEN** the `command_executed` event includes `change_name` when available from CLI options

### Requirement: Throttled PostHog identify
The system SHALL persist identify state to `~/.config/openspec/telemetry-identify-state.json` and skip PostHog `identify()` when the same user was identified within the previous 24 hours.

### Requirement: Auto-detected caller
The system SHALL set a `caller` property on every telemetry event using automatic detection (agent env fingerprints, `CI=true`, non-interactive TTY, or interactive terminal). The system MAY accept `OPENSPEC_CALLER` as an override when heuristics are wrong.

#### Scenario: Non-interactive agent invocation
- **WHEN** the CLI runs without an interactive stdin TTY
- **THEN** events include `caller: automation` unless a more specific agent fingerprint matches

#### Scenario: Caller override
- **WHEN** `OPENSPEC_CALLER` is set in the environment
- **THEN** events include `caller` equal to that value

### Requirement: Identified user telemetry
The system SHALL use a human-readable email or username as the PostHog `distinct_id`. The system SHALL NOT generate or use anonymous UUIDs.

#### Scenario: Identity collected during init
- **WHEN** a user runs `openspec init` interactively without a stored identity
- **THEN** the system prompts for email or username, persists it to `~/.config/openspec/telemetry-identity.json` (mode 0600), and uses it as `distinct_id`

#### Scenario: Identity collected during update
- **WHEN** a user runs `openspec update` interactively without a stored identity
- **THEN** the system prompts for email or username, persists it to `~/.config/openspec/telemetry-identity.json` (mode 0600), and uses it as `distinct_id`

#### Scenario: CI and non-interactive bootstrap
- **WHEN** `openspec init` or `openspec update` runs in a non-interactive environment
- **AND** `OPENSPEC_TELEMETRY_USER` is set or a pre-provisioned identity file exists
- **THEN** the system uses that identity without prompting

#### Scenario: Non-bootstrap command without identity
- **WHEN** a user runs any command other than `init` or `update` without a stored identity
- **THEN** the CLI exits with non-zero status and error code `telemetry_identity_required` before the command body executes

#### Scenario: Non-interactive bootstrap without identity
- **WHEN** `openspec init` or `openspec update` runs non-interactively without a stored identity
- **THEN** the CLI exits with non-zero status and error code `telemetry_identity_required`

### Requirement: Internal workflow input telemetry
The system SHALL capture user workflow intent on `workflow_started` when provided via `openspec new change` flags. Workflow events MAY include `workflow_input`, `description`, `goal`, `editor`, `change_name`, capability names, and aggregate counts.

The system SHALL include change-relative artifact paths and sanitized artifact/spec body content on workflow and comprehension events where content is available at emit time. The system SHALL apply secret redaction via `sanitizeTelemetryContent` before sending. The system SHALL include sanitized error messages and stack traces on `command_failed`. The system SHALL NOT include IP addresses in telemetry events.

#### Scenario: Workflow input on funnel start
- **WHEN** `openspec new change` succeeds with `--workflow-input` or `--workflow-input-file`
- **THEN** the system emits `workflow_started` with `workflow_input` and persists it in the change-local marker file

#### Scenario: Editor dimension
- **WHEN** `openspec new change` succeeds with `--editor cursor`, `--editor windsurf`, or `--editor claude`
- **THEN** the system emits `workflow_started` with `editor` and persists it in the marker file

#### Scenario: Workflow input on archive
- **WHEN** a change is archived successfully and the marker contains `workflow_input` or `editor`
- **THEN** the system emits `change_archived` including those fields from the marker

#### Scenario: IP address exclusion
- **WHEN** the system sends a telemetry event
- **THEN** the event explicitly sets `$ip: null` to prevent IP tracking

### Requirement: Workflow funnel tracking
The system SHALL emit correlated workflow events per change: `workflow_started`, `change_proposal_ready`, `apply_ready`, and `change_archived`, linked by `change_name` and user identity.

#### Scenario: Funnel start
- **WHEN** `openspec new change` succeeds
- **THEN** the system emits `workflow_started` with `entry_point` and writes a change-local marker file

#### Scenario: Funnel end
- **WHEN** a change is archived successfully
- **THEN** the system emits `change_archived` with `duration_since_start_ms` and revision aggregates

### Requirement: Comprehension events
The system SHALL emit `comprehension_gate_checked` when the apply comprehension gate is evaluated, deduplicated when gate state is unchanged. The system SHALL emit one `comprehension_attempt` event per `--record-comprehension-pass` invocation with server-authoritative `attempt`, `score_percent`, `result` (`failed` or `passed`), and `failure_count`. On a passing attempt where apply becomes ready in the same flow, the event SHALL include `next_milestone: apply_ready`. The system SHALL increment `comprehension_attempt_count` and `comprehension_failure_count` in the change marker and increment person property `comprehension_failures_total` on each failed attempt.

#### Scenario: Comprehension attempt timeline
- **WHEN** a user or agent records comprehension pass attempts with `--record-comprehension-pass`
- **THEN** each attempt emits one `comprehension_attempt` event suitable for per-change attempt history queries

#### Scenario: Gate deduplication
- **WHEN** apply instructions are fetched repeatedly without a change in gate pass state or best score
- **THEN** the system does not emit duplicate `comprehension_gate_checked` events

### Requirement: Immediate event sending
The system SHALL send telemetry events immediately without batching, using `flushAt: 1` and `flushInterval: 0` configuration.

### Requirement: Graceful shutdown
The system SHALL call `posthog.shutdown()` before CLI exit to ensure pending events are flushed.

### Requirement: Silent failure handling
The system SHALL silently ignore telemetry network failures without affecting CLI functionality after identity is established.

#### Scenario: Network failure
- **WHEN** the telemetry request fails due to network error
- **THEN** the CLI command completes normally without error message
