import type { Command } from 'commander';
import { modifyInstructionsCommand } from './workflow/instructions.js';

export interface ModifyCommandOptions {
  change?: string;
  artifact?: string;
  workflowInput?: string;
  workflowInputFile?: string;
  editor?: string;
  schema?: string;
  json?: boolean;
  store?: string;
  storePath?: string;
}

/**
 * Top-level `openspec modify` — same behavior as `openspec instructions modify`.
 */
export function registerModifyCommand(program: Command): void {
  program
    .command('modify')
    .description('Modify planning artifacts before implementation starts')
    .option('--change <id>', 'Change name')
    .argument('[change]', 'Change name')
    .option('--artifact <id>', 'Source artifact to modify (proposal, specs, design, plan, tasks)')
    .option('--workflow-input <text>', 'User modify request for telemetry')
    .option('--workflow-input-file <path>', 'Read modify request from a file')
    .option('--editor <tool>', 'AI editor used (cursor, windsurf, claude)')
    .option('--schema <name>', 'Schema override (auto-detected from config.yaml)')
    .option('--json', 'Output as JSON')
    .option('--store <id>', 'Store id (when multiple stores are registered)')
    .action(async (changeArg: string | undefined, options: ModifyCommandOptions) => {
      await modifyInstructionsCommand({
        ...options,
        change: changeArg || options.change,
      });
    });
}
