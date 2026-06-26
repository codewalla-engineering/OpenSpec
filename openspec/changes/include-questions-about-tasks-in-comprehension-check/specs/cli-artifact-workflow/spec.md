## ADDED Requirements

### Requirement: Apply comprehension quiz artifact coverage

When comprehension is enabled, apply workflow guidance SHALL instruct agents to generate quiz questions from proposal, design, delta specs, and pending tasks—each artifact type treated as a first-class question source when the file exists and has content.

#### Scenario: Proposal and design included as question sources

- **WHEN** apply comprehension guidance is generated for a change with `proposal.md`, `design.md`, delta specs, and pending tasks
- **THEN** the guidance instructs agents to read `contextFiles.proposal`, `contextFiles.design`, `contextFiles.specs`, and `contextFiles.tasks`
- **AND** instructs agents to draw questions from proposal motivation/scope, design decisions, requirements/scenarios, and pending task substance
- **AND** does not limit `design.md` to distractor-only use

#### Scenario: Balanced coverage when multiple artifacts exist

- **WHEN** proposal, design, delta specs with requirements, and pending tasks all exist for a change
- **THEN** apply comprehension guidance instructs agents to include at least one question sourced from each available category (proposal, design, specs/scenarios, pending tasks)
- **AND** remaining questions MAY draw from any category in proportion to change size

### Requirement: Apply comprehension quiz conceptual task questions

Apply workflow guidance SHALL require task-based comprehension questions to test general understanding of the implementation plan—not task numbering, checklist order, or verbatim checkbox text.

#### Scenario: Task questions test implementation understanding

- **WHEN** apply comprehension guidance instructs agents to create task-based questions
- **THEN** questions SHALL assess scope, approach, dependencies, sequencing rationale, or alignment with proposal/design
- **AND** correct answers SHALL be inferable from artifact substance without naming task numbers or matching exact checkbox labels

#### Scenario: Task numbering questions prohibited

- **WHEN** apply comprehension guidance describes forbidden question patterns
- **THEN** it SHALL prohibit questions about task numbers, checklist order, or verbatim reproduction of a single task line
- **AND** it SHALL prohibit questions whose correct answer is identifiable only by task index or checkbox position
