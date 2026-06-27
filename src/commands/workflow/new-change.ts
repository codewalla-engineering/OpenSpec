/**
 * New Change Command
 *
 * Creates a new change directory with optional description and schema in the
 * resolved OpenSpec root. `--store <id>` selects a registered store's
 * root; initiative linking and workspace affected areas are no longer part of
 * this command.
 */

import ora from 'ora';
import path from 'path';
import {
  trackWorkflowStarted,
  trackCommandFailed,
  normalizeEditor,
  resolveWorkflowInputAsync,
  type EntryPoint,
} from '../../telemetry/index.js';
import { createChange, validateChangeName } from '../../utils/change-utils.js';
import { formatChangeLocation } from '../../core/planning-home.js';
import {
  resolveRootForCommand,
  RootSelectionError,
  toPlanningHome,
  toRootOutput,
  withStoreFlag,
  isStoreSelectedRoot,
  type ResolvedOpenSpecRoot,
  type RootOutput,
} from '../../core/root-selection.js';
import { printJson, statusFromError, validateSchemaExists } from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NewChangeOptions {
  description?: string;
  goal?: string;
  schema?: string;
  store?: string;
  storePath?: string;
  initiative?: string;
  areas?: string;
  entryPoint?: string;
  workflowInput?: string;
  workflowInputFile?: string;
  editor?: string;
  json?: boolean;
}

interface NewChangeOutput {
  change: {
    id: string;
    path: string;
    metadataPath: string;
    schema: string;
  };
  root: RootOutput;
}

const VALID_ENTRY_POINTS = new Set<EntryPoint>(['propose', 'new', 'ff', 'manual']);

function resolveEntryPoint(value?: string): EntryPoint {
  const normalized = (value ?? 'manual').toLowerCase();
  if (VALID_ENTRY_POINTS.has(normalized as EntryPoint)) {
    return normalized as EntryPoint;
  }
  throw new Error(`Invalid --entry-point "${value}". Use: propose, new, ff, or manual.`);
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

function assertRemovedOptionsAbsent(options: NewChangeOptions): void {
  if (options.initiative !== undefined) {
    throw new RootSelectionError(
      '--initiative is no longer supported. Normal changes no longer attach to initiatives; --store <id> selects the OpenSpec root.',
      'initiative_option_removed',
      { target: 'change.options' }
    );
  }

  if (options.areas !== undefined) {
    throw new RootSelectionError(
      '--areas is no longer supported. Workspace affected areas are not part of the normal OpenSpec root path.',
      'areas_option_removed',
      { target: 'change.options' }
    );
  }
}

function printCreatedChangeHuman(
  payload: NewChangeOutput,
  root: ResolvedOpenSpecRoot
): void {
  const location =
    !isStoreSelectedRoot(root) && root.path === process.cwd()
      ? formatChangeLocation(toPlanningHome(root), payload.change.id)
      : payload.change.path;
  console.log(`Created change '${payload.change.id}' at ${location}/`);
  console.log(`Schema: ${payload.change.schema}`);
  console.log(`Next: ${withStoreFlag(root, `openspec status --change ${payload.change.id}`)}`);
}

export async function newChangeCommand(name: string | undefined, options: NewChangeOptions): Promise<void> {
  const spinner = options.json ? undefined : ora();

  try {
    if (!name) {
      throw new Error('Missing required argument <name>');
    }

    const validation = validateChangeName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    assertRemovedOptionsAbsent(options);

    const root = await resolveRootForCommand(options, {
      json: options.json,
      failurePayload: { change: null },
    });
    if (!root) {
      return;
    }

    const projectRoot = root.path;
    const entryPoint = resolveEntryPoint(options.entryPoint);
    const editor = normalizeEditor(options.editor);
    const workflowInput = await resolveWorkflowInputAsync({
      workflowInput: options.workflowInput,
      workflowInputFile: options.workflowInputFile,
    });

    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    const resolvedSchema = options.schema ?? root.defaultSchema;
    if (spinner) {
      spinner.start(`Creating change '${name}' with schema '${resolvedSchema}'...`);
    }

    const result = await createChange(projectRoot, name, {
      schema: options.schema,
      defaultSchema: root.defaultSchema,
      changesDir: root.changesDir,
      metadata: {
        ...(options.goal ? { goal: options.goal } : {}),
      },
    });

    if (options.description) {
      const { promises: fs } = await import('fs');
      const readmePath = path.join(result.changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    await trackWorkflowStarted({
      changeDir: result.changeDir,
      changeName: name,
      schema: result.schema,
      entryPoint,
      storeSelected: isStoreSelectedRoot(root),
      projectRoot,
      workflowInput,
      description: options.description,
      goal: options.goal,
      editor,
    });

    const payload: NewChangeOutput = {
      change: {
        id: name,
        path: result.changeDir,
        metadataPath: path.join(result.changeDir, '.openspec.yaml'),
        schema: result.schema,
      },
      root: toRootOutput(root),
    };

    if (options.json) {
      printJson(payload);
      return;
    }

    spinner?.stop();
    printCreatedChangeHuman(payload, root);
  } catch (error) {
    await trackCommandFailed('new_change', error);
    spinner?.stop();
    if (options.json) {
      printJson({
        change: null,
        status: [statusFromError(error)],
      });
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}
