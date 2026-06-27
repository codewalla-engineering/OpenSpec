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

The system SHALL NOT include file paths, artifact or spec body content, error stack traces, or IP addresses in telemetry events.

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
The system SHALL emit comprehension-related events when the apply gate is checked, a pass is recorded, or a pass fails.

### Requirement: Immediate event sending
The system SHALL send telemetry events immediately without batching, using `flushAt: 1` and `flushInterval: 0` configuration.

### Requirement: Graceful shutdown
The system SHALL call `posthog.shutdown()` before CLI exit to ensure pending events are flushed.

### Requirement: Silent failure handling
The system SHALL silently ignore telemetry network failures without affecting CLI functionality after identity is established.

#### Scenario: Network failure
- **WHEN** the telemetry request fails due to network error
- **THEN** the CLI command completes normally without error message
