## ADDED Requirements

### Requirement: Apply comprehension gate

The system SHALL block apply instructions when comprehension is enabled and no valid pass record exists for the current delta specs.

#### Scenario: Apply blocked without comprehension pass

- **WHEN** user runs `openspec instructions apply --change <id> --json`
- **AND** comprehension is enabled (default when config absent)
- **AND** delta specs contain at least one requirement
- **AND** no valid `.comprehension-pass.yaml` exists for the current spec fingerprint
- **THEN** the system outputs `state: "blocked"`
- **AND** outputs `missingComprehension: true`
- **AND** outputs a `comprehension` object with `required`, `passed`, `thresholdPercent`, `questionCount`, `requirementCount`, and `scenarioCount`

#### Scenario: Apply ready after comprehension pass

- **WHEN** user runs `openspec instructions apply --change <id> --json`
- **AND** a valid `.comprehension-pass.yaml` exists matching the current spec fingerprint
- **THEN** the system outputs `state: "ready"` (when other apply preconditions are met)
- **AND** outputs `comprehension.passed: true`

#### Scenario: Comprehension pass invalidated on spec change

- **WHEN** delta spec files change after a pass was recorded
- **AND** user runs `openspec instructions apply --change <id> --json`
- **THEN** the system treats comprehension as not passed
- **AND** outputs `state: "blocked"` with `missingComprehension: true`

#### Scenario: Comprehension gate disabled in config

- **WHEN** `openspec/config.yaml` sets `comprehension.enabled: false`
- **AND** user runs `openspec instructions apply --change <id> --json`
- **THEN** the system does not block apply for comprehension

#### Scenario: Comprehension skipped when no requirements

- **WHEN** delta specs exist but contain zero ADDED/MODIFIED requirements
- **AND** user runs `openspec instructions apply --change <id> --json`
- **THEN** the system does not block apply for comprehension

### Requirement: Record comprehension pass via apply instructions

The system SHALL support recording a comprehension quiz pass through `openspec instructions apply`.

#### Scenario: Record pass with sufficient score

- **WHEN** user runs `openspec instructions apply --change <id> --record-comprehension-pass --score <n> --json`
- **AND** `<n>` is greater than or equal to the configured threshold (default 80)
- **THEN** the system writes `.comprehension-pass.yaml` in the change directory
- **AND** outputs `recorded: true`

#### Scenario: Reject pass below threshold

- **WHEN** user runs `openspec instructions apply --change <id> --record-comprehension-pass --score <n> --json`
- **AND** `<n>` is below the configured threshold
- **THEN** the system does not write a pass file
- **AND** exits with a non-zero status
