import type { Command } from 'commander';
import { applyInstructionsCommand } from './workflow/instructions.js';

export interface QuizCommandOptions {
  change?: string;
  recordPass?: boolean;
  score?: number;
  attempt?: number;
  questionCount?: number;
  schema?: string;
  json?: boolean;
  store?: string;
  storePath?: string;
}

/**
 * Top-level `openspec quiz` — records a comprehension pass the same way as
 * `openspec instructions apply --record-comprehension-pass`.
 */
export function registerQuizCommand(program: Command): void {
  program
    .command('quiz')
    .description('Record a comprehension quiz pass for a change')
    .option('--change <id>', 'Change name')
    .option('--record-pass', 'Record a quiz pass')
    .option('--score <percent>', 'Score percentage (0-100)', parseInt)
    .option('--attempt <n>', 'Quiz attempt number', parseInt)
    .option('--question-count <n>', 'Number of quiz questions taken', parseInt)
    .option('--schema <name>', 'Schema override (auto-detected from config.yaml)')
    .option('--json', 'Output as JSON')
    .option('--store <id>', 'Store id (when multiple stores are registered)')
    .action(async (options: QuizCommandOptions) => {
      if (!options.recordPass) {
        if (options.json) {
          console.log(
            JSON.stringify({
              error: 'Only --record-pass is supported',
              usage:
                'openspec quiz --change <name> --record-pass --score <percent> [--attempt <n>] [--question-count <n>]',
            })
          );
        } else {
          console.error(
            'Only --record-pass is supported. Use: openspec quiz --change <name> --record-pass --score <percent>'
          );
        }
        process.exitCode = 1;
        return;
      }

      await applyInstructionsCommand({
        change: options.change,
        schema: options.schema,
        json: options.json,
        store: options.store,
        storePath: options.storePath,
        recordComprehensionPass: true,
        score: options.score,
        attempt: options.attempt,
        questionCount: options.questionCount,
      });
    });
}
