/**
 * Central telemetry event registry — the single source of truth for which
 * events may be emitted and which properties each may carry.
 *
 * Anything not declared here is dropped: unknown event names are rejected and
 * properties outside an event's whitelist are stripped before capture. This is
 * deliberate — the internal tool's analytics are fixed by definition, not by
 * caller convention.
 */

/** Props injected by enrichFromMarker() into workflow/comprehension events. */
const MARKER_ENRICHMENT_PROPS = [
  'editor',
  'entry_point',
  'workflow_input',
  'duration_since_start_ms',
] as const;

interface EventSchemaEntry {
  /** Whitelisted top-level event properties. */
  props: readonly string[];
  /** Allowed $set person-property keys (comprehension_attempt only). */
  personSet?: readonly string[];
  /** Allowed $increment person-property keys (comprehension_attempt only). */
  personIncrement?: readonly string[];
}

function entry(props: readonly string[], extra: Omit<EventSchemaEntry, 'props'> = {}): EventSchemaEntry {
  return { props, ...extra };
}

/** Marker-enriched workflow/comprehension events share these enrichment keys. */
function enriched(props: readonly string[], extra: Omit<EventSchemaEntry, 'props'> = {}): EventSchemaEntry {
  return entry([...props, ...MARKER_ENRICHMENT_PROPS], extra);
}

export const EVENT_SCHEMAS = {
  command_executed: entry([
    'command',
    'version',
    'change_name',
    'schema',
    'command_category',
  ]),
  command_failed: entry(['command', 'error_code', 'error_message', 'stack_trace']),
  feedback_submitted: entry(['has_body']),
  config_value_set: entry(['key']),
  config_profile_changed: entry(['profile', 'delivery', 'workflow_count', 'changes']),
  change_validated: entry(['valid', 'issue_count', 'strict', 'duration_ms']),
  spec_validated: entry(['valid', 'issue_count', 'strict', 'duration_ms']),
  bulk_validation_run: entry([
    'total',
    'passed',
    'failed',
    'scope_changes',
    'scope_specs',
    'strict',
  ]),
  store_setup: entry(['git_initialized', 'already_registered', 'has_remote']),
  store_registered: entry(['already_registered', 'git_is_repository']),
  store_removed: entry(['files_deleted']),
  workset_created: entry(['member_count', 'has_tool']),
  workset_opened: entry(['opener_style', 'member_count', 'skipped_count']),
  workset_removed: entry([]),
  workflow_started: enriched([
    'change_name',
    'schema',
    'store_selected',
    'description',
    'goal',
  ]),
  change_proposal_ready: enriched([
    'change_name',
    'schema',
    'artifact_count',
    'artifact_paths',
  ]),
  apply_ready: enriched(['change_name', 'artifact_paths']),
  artifact_instructions_requested: enriched([
    'change_name',
    'artifact_id',
    'artifact_was_done',
    'artifact_paths',
    'artifact_body',
  ]),
  artifact_revision_requested: enriched([
    'change_name',
    'artifact_id',
    'revision_number',
  ]),
  artifact_modify_requested: enriched([
    'change_name',
    'schema',
    'source_artifact_id',
    'downstream_artifact_ids',
    'artifacts_to_update',
    'phase',
    'modify_input',
  ]),
  artifact_content_changed: enriched([
    'change_name',
    'artifact_id',
    'change_count',
    'artifact_paths',
    'body_before',
    'body_after',
  ]),
  spec_delta_applied: entry([
    'change_name',
    'capability',
    'requirements_added',
    'requirements_modified',
    'requirements_removed',
    'requirements_renamed',
  ]),
  spec_delta_lines_changed: entry([
    'change_name',
    'capability',
    'lines_added',
    'lines_removed',
  ]),
  implementation_changed: entry([
    'change_name',
    'files_changed',
    'lines_added',
    'lines_removed',
    'lines_changed',
    'spec_capabilities_count',
  ]),
  change_archived: entry([
    'change_name',
    'schema',
    'specs_updated',
    'tasks_complete',
    'entry_point',
    'workflow_input',
    'editor',
    'duration_since_start_ms',
    'duration_proposal_to_ready_ms',
    'duration_ready_to_archive_ms',
    'total_revisions',
    'revision_counts',
    'specs',
    'implementation',
    'requirements_added',
    'requirements_modified',
    'requirements_removed',
    'requirements_renamed',
  ]),
  comprehension_attempt: enriched(
    [
      'change_name',
      'attempt',
      'score_percent',
      'threshold_percent',
      'question_count',
      'passed',
      'result',
      'failure_count',
      'gap_to_pass',
      'next_milestone',
      'artifact_paths',
      'artifact_bodies',
      'recorded_by',
    ],
    {
      personSet: [
        'comprehension_last_pass_attempt',
        'comprehension_last_pass_failures_before',
      ],
      personIncrement: ['comprehension_failures_total'],
    }
  ),
  comprehension_gate_checked: enriched([
    'change_name',
    'required',
    'passed',
    'threshold_percent',
    'question_count',
    'best_score_percent',
    'attempts',
    'state',
    'artifact_paths',
  ]),
  comprehension_retake_required: enriched([
    'change_name',
    'best_score_percent',
    'threshold_percent',
  ]),
} as const;

export type TelemetryEventName = keyof typeof EVENT_SCHEMAS;

export function getEventSchema(event: string): EventSchemaEntry | undefined {
  return (EVENT_SCHEMAS as Record<string, EventSchemaEntry>)[event];
}
