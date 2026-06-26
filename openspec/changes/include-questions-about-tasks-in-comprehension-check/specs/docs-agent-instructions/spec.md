## ADDED Requirements

### Requirement: Apply comprehension quiz documentation

Agent-facing workflow documentation SHALL describe the apply comprehension quiz scope and question-quality rules so agents test holistic change understanding before implementation.

#### Scenario: Document multi-artifact quiz sources

- **WHEN** workflow or customization docs describe the apply comprehension quiz
- **THEN** they SHALL state that questions cover proposal, design, delta specs, and pending tasks when those artifacts exist
- **AND** they SHALL explain that design and proposal are question sources, not distractor-only inputs

#### Scenario: Document conceptual task question rules

- **WHEN** workflow or customization docs describe task-based quiz questions
- **THEN** they SHALL state that questions test general understanding of the implementation plan
- **AND** they SHALL state that questions MUST NOT ask about task numbers, checklist order, or verbatim task checkbox text
