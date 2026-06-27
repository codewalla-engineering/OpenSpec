/**
 * Instructions Command
 *
 * Generates enriched instructions for creating artifacts or applying tasks.
 * Includes both artifact instructions and apply instructions.
 */

import ora from 'ora';
import path from 'path';
import * as fs from 'fs';
import {
  loadChangeContext,
  generateInstructions,
  resolveSchema,
  resolveArtifactOutputs,
  type ArtifactInstructions,
} from '../../core/artifact-graph/index.js';
import {
  getChangeDir,
  resolveCurrentPlanningHomeSync,
  type PlanningHome,
} from '../../core/planning-home.js';
import {
  resolveRootForCommand,
  withStoreFlag,
  toPlanningHome,
  toRootOutput,
  type ResolvedOpenSpecRoot,
} from '../../core/root-selection.js';
import {
  assembleReferenceIndex,
  renderReferencedStoresBlock,
  renderReferencedStoresSection,
  type ReferenceIndexEntry,
} from '../../core/references.js';
import { readRegistrySnapshot } from '../../core/store/registry.js';
import { readProjectConfig, type ProjectConfig } from '../../core/project-config.js';
import {
  checkComprehensionGate,
  ComprehensionPassError,
  computeSpecStats,
  recordComprehensionPass,
  resolveComprehensionConfig,
  type ArtifactPresence,
} from '../../core/comprehension/index.js';
import {
  maybeEmitProposalReady,
  maybeEmitApplyReady,
  trackArtifactInstructions,
  trackArtifactContentChanges,
  incrementComprehensionAttempt,
  incrementComprehensionFailureCount,
  trackComprehensionAttempt,
  trackComprehensionGateChecked,
  trackComprehensionRetakeRequired,
} from '../../telemetry/index.js';
import {
  validateChangeExists,
  validateSchemaExists,
  type TaskItem,
  type ApplyInstructions,
} from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface InstructionsOptions {
  change?: string;
  schema?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

export interface ApplyInstructionsOptions {
  change?: string;
  schema?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
  recordComprehensionPass?: boolean;
  score?: number;
  attempt?: number;
  questionCount?: number;
}

function buildArtifactPresence(contextFiles: Record<string, string[]>, pendingTaskCount: number): ArtifactPresence {
  return {
    hasPlan: (contextFiles.plan?.length ?? 0) > 0,
    hasProposal: (contextFiles.proposal?.length ?? 0) > 0,
    hasDesign: (contextFiles.design?.length ?? 0) > 0,
    hasSpecs: (contextFiles.specs?.length ?? 0) > 0,
    hasTasks: pendingTaskCount > 0 || (contextFiles.tasks?.length ?? 0) > 0,
  };
}

function resolvePlanPath(contextFiles: Record<string, string[]>, changeDir: string): string | null {
  if (contextFiles.plan?.[0]) {
    return contextFiles.plan[0];
  }
  const fallback = path.join(changeDir, 'plan.md');
  return fs.existsSync(fallback) ? fallback : null;
}

// -----------------------------------------------------------------------------
// Artifact Instructions Command
// -----------------------------------------------------------------------------

/**
 * Reads the resolved root's config once, assembles the referenced-store
 * index when references are declared, and resolves the config path for
 * fix text. Shared by both instruction surfaces.
 */
async function loadRootConfigContext(root: ResolvedOpenSpecRoot): Promise<{
  projectConfig: ProjectConfig | null;
  references: ReferenceIndexEntry[] | undefined;
}> {
  // readProjectConfig never throws: missing/unparseable configs are null.
  const projectConfig = readProjectConfig(root.path);

  // One registry read serves every relationship consumer in this
  // output so it never carries a torn snapshot.
  const snapshot = await readRegistrySnapshot();
  const registryEntries = snapshot.entries;

  const declared = projectConfig?.references ?? [];
  const index =
    declared.length > 0
      ? await assembleReferenceIndex({ references: declared, resolvedRoot: root, registryEntries })
      : [];

  // Omitted, not empty: an index emptied by self-reference omission must
  // look identical to an undeclared one in JSON.
  return {
    projectConfig,
    references: index.length > 0 ? index : undefined,
  };
}

export async function instructionsCommand(
  artifactId: string | undefined,
  options: InstructionsOptions
): Promise<void> {
  // Resolve (and banner) before the spinner starts so stderr stays readable.
  const root = await resolveRootForCommand(options, { json: options.json });
  if (!root) {
    return;
  }

  const spinner = options.json ? undefined : ora('Generating instructions...').start();

  try {
    const planningHome = toPlanningHome(root);
    const projectRoot = root.path;
    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      root.changesDir,
      { newChangeHint: withStoreFlag(root, 'openspec new change <name>') }
    );

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    // loadChangeContext will auto-detect schema from metadata if not provided
    const context = loadChangeContext(projectRoot, changeName, options.schema, {
      changeDir: getChangeDir(planningHome, changeName),
      planningHome,
    });

    if (!artifactId) {
      spinner?.stop();
      const validIds = context.graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Missing required argument <artifact>. Valid artifacts:\n  ${validIds.join('\n  ')}`
      );
    }

    const artifact = context.graph.getArtifact(artifactId);

    if (!artifact) {
      spinner?.stop();
      const validIds = context.graph.getAllArtifacts().map((a) => a.id);
      throw new Error(
        `Artifact '${artifactId}' not found in schema '${context.schemaName}'. Valid artifacts:\n  ${validIds.join('\n  ')}`
      );
    }

    const { projectConfig, references } = await loadRootConfigContext(root);
    const instructions = generateInstructions(context, artifactId, projectRoot, {
      projectConfig,
      references,
    });
    const isBlocked = instructions.dependencies.some((d) => !d.done);

    const artifactOutputs = resolveArtifactOutputs(context.changeDir, artifact.generates);
    await trackArtifactInstructions({
      changeDir: context.changeDir,
      changeName,
      artifactId,
      artifactWasDone: artifactOutputs.length > 0,
      artifactPaths: artifactOutputs,
    });

    const contextFiles: Record<string, string[]> = {};
    for (const a of context.graph.getAllArtifacts()) {
      const outputs = resolveArtifactOutputs(context.changeDir, a.generates);
      if (outputs.length > 0) {
        contextFiles[a.id] = outputs;
      }
    }
    await trackArtifactContentChanges({
      changeDir: context.changeDir,
      changeName,
      contextFiles,
    });

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ ...instructions, root: toRootOutput(root) }, null, 2));
      return;
    }

    printInstructionsText(instructions, isBlocked);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printInstructionsText(instructions: ArtifactInstructions, isBlocked: boolean): void {
  const {
    artifactId,
    changeName,
    schemaName,
    changeDir,
    resolvedOutputPath,
    description,
    instruction,
    context,
    rules,
    template,
    dependencies,
    unlocks,
  } = instructions;

  // Opening tag
  console.log(`<artifact id="${artifactId}" change="${changeName}" schema="${schemaName}">`);
  console.log();

  // Warning for blocked artifacts
  if (isBlocked) {
    const missing = dependencies.filter((d) => !d.done).map((d) => d.id);
    console.log('<warning>');
    console.log('This artifact has unmet dependencies. Complete them first or proceed with caution.');
    console.log(`Missing: ${missing.join(', ')}`);
    console.log('</warning>');
    console.log();
  }

  // Task directive
  console.log('<task>');
  console.log(`Create the ${artifactId} artifact for change "${changeName}".`);
  console.log(description);
  console.log('</task>');
  console.log();

  // Project context (AI constraint - do not include in output)
  if (context) {
    console.log('<project_context>');
    console.log('<!-- This is background information for you. Do NOT include this in your output. -->');
    console.log(context);
    console.log('</project_context>');
    console.log();
  }

  // Referenced-store index (read-only upstream context)
  if (instructions.references && instructions.references.length > 0) {
    console.log(renderReferencedStoresBlock(instructions.references));
    console.log();
  }

  // Rules (AI constraint - do not include in output)
  if (rules && rules.length > 0) {
    console.log('<rules>');
    console.log('<!-- These are constraints for you to follow. Do NOT include this in your output. -->');
    for (const rule of rules) {
      console.log(`- ${rule}`);
    }
    console.log('</rules>');
    console.log();
  }

  // Dependencies (files to read for context)
  if (dependencies.length > 0) {
    console.log('<dependencies>');
    console.log('Read these files for context before creating this artifact:');
    console.log();
    for (const dep of dependencies) {
      const status = dep.done ? 'done' : 'missing';
      const fullPath = path.join(changeDir, dep.path);
      console.log(`<dependency id="${dep.id}" status="${status}">`);
      console.log(`  <path>${fullPath}</path>`);
      console.log(`  <description>${dep.description}</description>`);
      console.log('</dependency>');
    }
    console.log('</dependencies>');
    console.log();
  }

  // Output location
  console.log('<output>');
  console.log(`Write to: ${resolvedOutputPath}`);
  console.log('</output>');
  console.log();

  // Instruction (guidance)
  if (instruction) {
    console.log('<instruction>');
    console.log(instruction.trim());
    console.log('</instruction>');
    console.log();
  }

  // Template
  console.log('<template>');
  console.log('<!-- Use this as the structure for your output file. Fill in the sections. -->');
  console.log(template.trim());
  console.log('</template>');
  console.log();

  // Success criteria placeholder
  console.log('<success_criteria>');
  console.log('<!-- To be defined in schema validation rules -->');
  console.log('</success_criteria>');
  console.log();

  // Unlocks
  if (unlocks.length > 0) {
    console.log('<unlocks>');
    console.log(`Completing this artifact enables: ${unlocks.join(', ')}`);
    console.log('</unlocks>');
    console.log();
  }

  // Closing tag
  console.log('</artifact>');
}

// -----------------------------------------------------------------------------
// Apply Instructions Command
// -----------------------------------------------------------------------------

/**
 * Parses tasks.md content and extracts task items with their completion status.
 */
function parseTasksFile(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split('\n');
  let taskIndex = 0;

  for (const line of lines) {
    // Match checkbox patterns: - [ ] or - [x] or - [X]
    const checkboxMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)\s*$/);
    if (checkboxMatch) {
      taskIndex++;
      const done = checkboxMatch[1].toLowerCase() === 'x';
      const description = checkboxMatch[2].trim();
      tasks.push({
        id: `${taskIndex}`,
        description,
        done,
      });
    }
  }

  return tasks;
}

function resolveComprehensionQuestionCount(
  optionCount: number | undefined,
  specPaths: string[],
  projectConfig: ProjectConfig | null | undefined,
  pendingTaskCount: number,
  artifactPresence: ArtifactPresence
): number {
  if (optionCount !== undefined && optionCount > 0) {
    return optionCount;
  }
  const config = resolveComprehensionConfig(projectConfig);
  return computeSpecStats(specPaths, config, pendingTaskCount, artifactPresence).questionCount;
}

async function emitComprehensionAttemptAfterPass(params: {
  changeDir: string;
  changeName: string;
  attempt: number;
  failureCountBefore: number;
  scorePercent: number;
  thresholdPercent: number;
  questionCount: number;
  contextFiles: Record<string, string[]>;
  applyReadyEmitted: boolean;
}): Promise<void> {
  await trackComprehensionAttempt({
    changeDir: params.changeDir,
    changeName: params.changeName,
    attempt: params.attempt,
    scorePercent: params.scorePercent,
    thresholdPercent: params.thresholdPercent,
    questionCount: params.questionCount,
    passed: true,
    failureCountBefore: params.failureCountBefore,
    nextMilestone: params.applyReadyEmitted ? 'apply_ready' : undefined,
    contextFiles: params.contextFiles,
  });
}

export interface GenerateApplyInstructionsOptions {
  planningHome?: PlanningHome;
  references?: ReferenceIndexEntry[];
  projectConfig?: ProjectConfig | null;
}

/**
 * Generates apply instructions for implementing tasks from a change.
 * Schema-aware: reads apply phase configuration from schema to determine
 * required artifacts, tracking file, and instruction.
 */
export async function generateApplyInstructions(
  projectRoot: string,
  changeName: string,
  schemaName?: string,
  options: GenerateApplyInstructionsOptions = {}
): Promise<ApplyInstructions> {
  const planningHome =
    options.planningHome ?? resolveCurrentPlanningHomeSync({ startPath: projectRoot });
  const references = options.references;
  // loadChangeContext will auto-detect schema from metadata if not provided
  const context = loadChangeContext(projectRoot, changeName, schemaName, {
    changeDir: getChangeDir(planningHome, changeName),
    planningHome,
  });
  const changeDir = context.changeDir;

  // Get the full schema to access the apply phase configuration
  const schema = resolveSchema(context.schemaName, projectRoot);
  const applyConfig = schema.apply;

  // Determine required artifacts and tracking file from schema
  // Fallback: if no apply block, require all artifacts
  const requiredArtifactIds = applyConfig?.requires ?? schema.artifacts.map((a) => a.id);
  const tracksFile = applyConfig?.tracks ?? null;
  const schemaInstruction = applyConfig?.instruction ?? null;

  // Check which required artifacts are missing
  const missingArtifacts: string[] = [];
  for (const artifactId of requiredArtifactIds) {
    const artifact = schema.artifacts.find((a) => a.id === artifactId);
    if (artifact && resolveArtifactOutputs(changeDir, artifact.generates).length === 0) {
      missingArtifacts.push(artifactId);
    }
  }

  // Build context files from all existing artifacts in schema
  const contextFiles: Record<string, string[]> = {};
  for (const artifact of schema.artifacts) {
    const outputs = resolveArtifactOutputs(changeDir, artifact.generates);
    if (outputs.length > 0) {
      contextFiles[artifact.id] = outputs;
    }
  }

  // Parse tasks if tracking file exists
  let tasks: TaskItem[] = [];
  let tracksFileExists = false;
  if (tracksFile) {
    const tracksPath = path.join(changeDir, tracksFile);
    tracksFileExists = fs.existsSync(tracksPath);
    if (tracksFileExists) {
      const tasksContent = await fs.promises.readFile(tracksPath, 'utf-8');
      tasks = parseTasksFile(tasksContent);
    }
  }

  // Calculate progress
  const total = tasks.length;
  const complete = tasks.filter((t) => t.done).length;
  const remaining = total - complete;

  // Determine state and instruction
  let state: ApplyInstructions['state'];
  let instruction: string;

  if (missingArtifacts.length > 0) {
    state = 'blocked';
    instruction = `Cannot apply this change yet. Missing artifacts: ${missingArtifacts.join(', ')}.\nUse the openspec-continue-change skill to create the missing artifacts first.`;
  } else if (tracksFile && !tracksFileExists) {
    // Tracking file configured but doesn't exist yet
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction = `The ${tracksFilename} file is missing and must be created.\nUse openspec-continue-change to generate the tracking file.`;
  } else if (tracksFile && tracksFileExists && total === 0) {
    // Tracking file exists but contains no tasks
    const tracksFilename = path.basename(tracksFile);
    state = 'blocked';
    instruction = `The ${tracksFilename} file exists but contains no tasks.\nAdd tasks to ${tracksFilename} or regenerate it with openspec-continue-change.`;
  } else if (tracksFile && remaining === 0 && total > 0) {
    state = 'all_done';
    instruction = 'All tasks are complete! This change is ready to be archived.\nConsider running tests and reviewing the changes before archiving.';
  } else if (!tracksFile) {
    // No tracking file configured in schema - ready to apply
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'All required artifacts complete. Proceed with implementation.';
  } else {
    state = 'ready';
    instruction = schemaInstruction?.trim() ?? 'Read context files, work through pending tasks, mark complete as you go.\nPause if you hit blockers or need clarification.';
  }

  let missingComprehension: boolean | undefined;
  let comprehension: ApplyInstructions['comprehension'];
  let applyReadyEmitted = false;

  await trackArtifactContentChanges({ changeDir, changeName, contextFiles });
  await maybeEmitProposalReady({
    changeDir,
    changeName,
    schema: context.schemaName,
    missingArtifacts,
    artifactCount: schema.artifacts.length,
    contextFiles,
  });

  if (state === 'ready') {
    const specPaths = contextFiles.specs ?? [];
    const tasksPath =
      tracksFile && tracksFileExists ? path.join(changeDir, tracksFile) : null;
    const planPath = resolvePlanPath(contextFiles, changeDir);
    const pendingTaskCount = tasks.filter((task) => !task.done).length;
    const artifactPresence = buildArtifactPresence(contextFiles, pendingTaskCount);
    const gate = checkComprehensionGate(
      changeDir,
      specPaths,
      options.projectConfig ?? readProjectConfig(projectRoot),
      { tasksPath, planPath, pendingTaskCount, artifactPresence }
    );
    if (gate.active && !gate.passed && gate.info) {
      state = 'blocked';
      missingComprehension = true;
      comprehension = gate.info;
      instruction = `Complete the comprehension quiz in /opsx:apply before implementation (score ≥ ${gate.info.thresholdPercent}% on proposal, design, specs, plan, and tasks; plan receives the majority of questions per questionAllocation).`;
    } else if (gate.active && gate.info) {
      comprehension = gate.info;
    }

    applyReadyEmitted = await maybeEmitApplyReady({
      changeDir,
      changeName,
      state,
      contextFiles,
    });

    if (gate.active && gate.info) {
      await trackComprehensionGateChecked({
        changeDir,
        changeName,
        passed: gate.passed,
        gateInfo: gate.info,
        state: gate.passed ? 'ready' : 'blocked',
        contextFiles,
      });
      if (!gate.passed && gate.info.bestScorePercent !== undefined) {
        await trackComprehensionRetakeRequired({
          changeDir,
          changeName,
          gateInfo: gate.info,
        });
      }
    }
  }

  return {
    changeName,
    changeDir,
    schemaName: context.schemaName,
    contextFiles,
    progress: { total, complete, remaining },
    tasks,
    state,
    missingArtifacts: missingArtifacts.length > 0 ? missingArtifacts : undefined,
    missingComprehension,
    comprehension,
    instruction,
    applyReadyEmitted,
    ...(references !== undefined ? { references } : {}),
  };
}

export async function applyInstructionsCommand(options: ApplyInstructionsOptions): Promise<void> {
  // Resolve (and banner) before the spinner starts so stderr stays readable.
  const root = await resolveRootForCommand(options, { json: options.json });
  if (!root) {
    return;
  }

  const spinner = options.json ? undefined : ora('Generating apply instructions...').start();

  try {
    const planningHome = toPlanningHome(root);
    const projectRoot = root.path;
    const changeName = await validateChangeExists(
      options.change,
      projectRoot,
      root.changesDir,
      { newChangeHint: withStoreFlag(root, 'openspec new change <name>') }
    );

    // Validate schema if explicitly provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    const { projectConfig, references } = await loadRootConfigContext(root);

    if (options.recordComprehensionPass) {
      if (options.score === undefined) {
        spinner?.stop();
        throw new Error('--score is required with --record-comprehension-pass');
      }

      const context = loadChangeContext(projectRoot, changeName, options.schema, {
        changeDir: getChangeDir(planningHome, changeName),
        planningHome,
      });
      const changeDir = context.changeDir;
      const schema = resolveSchema(context.schemaName, projectRoot);
      const specPaths: string[] = [];
      const specsArtifact = schema.artifacts.find((a) => a.id === 'specs');
      if (specsArtifact) {
        specPaths.push(...resolveArtifactOutputs(changeDir, specsArtifact.generates));
      }
      const tracksFile = schema.apply?.tracks ?? null;
      const tasksPath = tracksFile ? path.join(changeDir, tracksFile) : null;
      const planPath = fs.existsSync(path.join(changeDir, 'plan.md'))
        ? path.join(changeDir, 'plan.md')
        : null;
      const pendingTaskCount =
        tasksPath && fs.existsSync(tasksPath)
          ? parseTasksFile(fs.readFileSync(tasksPath, 'utf-8')).filter((t) => !t.done).length
          : 0;
      const contextFilesForPresence: Record<string, string[]> = {};
      for (const artifact of schema.artifacts) {
        const outputs = resolveArtifactOutputs(changeDir, artifact.generates);
        if (outputs.length > 0) {
          contextFilesForPresence[artifact.id] = outputs;
        }
      }
      const artifactPresence = buildArtifactPresence(contextFilesForPresence, pendingTaskCount);
      const questionCount = resolveComprehensionQuestionCount(
        options.questionCount,
        specPaths,
        projectConfig,
        pendingTaskCount,
        artifactPresence
      );
      const { attempt, failureCountBefore } = await incrementComprehensionAttempt(changeDir);

      try {
        const record = recordComprehensionPass({
          changeDir,
          specPaths,
          tasksPath,
          planPath,
          projectConfig,
          scorePercent: options.score,
          attempt,
          questionCount,
          pendingTaskCount,
          artifactPresence,
        });

        spinner?.stop();

        const instructions = await generateApplyInstructions(projectRoot, changeName, options.schema, {
          planningHome,
          references,
          projectConfig,
        });

        await emitComprehensionAttemptAfterPass({
          changeDir,
          changeName,
          attempt: record.attempt,
          failureCountBefore,
          scorePercent: record.score_percent,
          thresholdPercent: record.threshold_percent,
          questionCount: record.question_count,
          contextFiles: instructions.contextFiles,
          applyReadyEmitted: instructions.applyReadyEmitted ?? false,
        });

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                recorded: true,
                comprehensionPass: record,
                ...instructions,
                root: toRootOutput(root),
              },
              null,
              2
            )
          );
          return;
        }

        console.log(`Comprehension pass recorded (${record.score_percent}%).`);
        printApplyInstructionsText(instructions);
        return;
      } catch (error) {
        spinner?.stop();
        if (error instanceof ComprehensionPassError) {
          await incrementComprehensionFailureCount(changeDir);
          await trackComprehensionAttempt({
            changeDir,
            changeName,
            attempt,
            scorePercent: options.score,
            thresholdPercent: error.threshold,
            questionCount,
            passed: false,
            failureCountBefore,
            contextFiles: contextFilesForPresence,
          });
          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  recorded: false,
                  status: [
                    {
                      severity: 'error',
                      code: 'comprehension_score_below_threshold',
                      message: error.message,
                    },
                  ],
                  root: toRootOutput(root),
                },
                null,
                2
              )
            );
            process.exitCode = 1;
            return;
          }
        }
        throw error;
      }
    }

    // generateApplyInstructions uses loadChangeContext which auto-detects schema
    const instructions = await generateApplyInstructions(projectRoot, changeName, options.schema, {
      planningHome,
      references,
      projectConfig,
    });

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({ ...instructions, root: toRootOutput(root) }, null, 2));
      return;
    }

    printApplyInstructionsText(instructions);
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

export function printApplyInstructionsText(instructions: ApplyInstructions): void {
  const {
    changeName,
    schemaName,
    contextFiles,
    progress,
    tasks,
    state,
    missingArtifacts,
    missingComprehension,
    comprehension,
    instruction,
  } = instructions;

  console.log(`## Apply: ${changeName}`);
  console.log(`Schema: ${schemaName}`);
  console.log();

  if (instructions.references && instructions.references.length > 0) {
    console.log(renderReferencedStoresSection(instructions.references));
    console.log();
  }

  // Warning for blocked state
  if (state === 'blocked' && missingArtifacts) {
    console.log('### ⚠️ Blocked');
    console.log();
    console.log(`Missing artifacts: ${missingArtifacts.join(', ')}`);
    console.log('Use the openspec-continue-change skill to create these first.');
    console.log();
  }

  if (state === 'blocked' && missingComprehension && comprehension) {
    console.log('### ⚠️ Comprehension Required');
    console.log();
    console.log(
      `Pass the comprehension quiz (score ≥ ${comprehension.thresholdPercent}%) before implementation.`
    );
    console.log(`Questions: ${comprehension.questionCount} (${comprehension.optionsPerQuestion} options each)`);
    const allocationParts = Object.entries(comprehension.questionAllocation)
      .filter(([, count]) => (count ?? 0) > 0)
      .map(([category, count]) => `${category}×${count}`);
    if (allocationParts.length > 0) {
      console.log(`Allocation: ${allocationParts.join(', ')}`);
    }
    console.log(
      `Specs: ${comprehension.requirementCount} requirements, ${comprehension.scenarioCount} scenarios; Tasks: ${comprehension.pendingTaskCount} pending`
    );
    if (comprehension.bestScorePercent !== undefined) {
      console.log(`Previous score: ${comprehension.bestScorePercent}% (artifacts changed — retake required)`);
    }
    console.log('Complete the quiz via /opsx:apply.');
    console.log();
  }

  // Context files (dynamically from schema)
  const contextFileEntries = Object.entries(contextFiles);
  if (contextFileEntries.length > 0) {
    console.log('### Context Files');
    for (const [artifactId, filePaths] of contextFileEntries) {
      for (const filePath of filePaths) {
        console.log(`- ${artifactId}: ${filePath}`);
      }
    }
    console.log();
  }

  // Progress (only show if we have tracking)
  if (progress.total > 0 || tasks.length > 0) {
    console.log('### Progress');
    if (state === 'all_done') {
      console.log(`${progress.complete}/${progress.total} complete ✓`);
    } else {
      console.log(`${progress.complete}/${progress.total} complete`);
    }
    console.log();
  }

  // Tasks
  if (tasks.length > 0) {
    console.log('### Tasks');
    for (const task of tasks) {
      const checkbox = task.done ? '[x]' : '[ ]';
      console.log(`- ${checkbox} ${task.description}`);
    }
    console.log();
  }

  // Instruction
  console.log('### Instruction');
  console.log(instruction);
}
