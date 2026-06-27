import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import {
  buildCommandTelemetryContext,
  resolveTelemetryCommandPath,
} from '../../src/telemetry/command-context.js';

function makeInstructionsCommand(args: string[], opts: Record<string, unknown> = {}): Command {
  const program = new Command();
  const cmd = program
    .command('instructions [artifact]')
    .option('--change <id>', 'Change name')
    .option('--schema <name>', 'Schema override')
    .option('--record-comprehension-pass', 'Record pass')
    .action(() => {});

  cmd.args = args;
  for (const [key, value] of Object.entries(opts)) {
    (cmd as Command & { setOptionValue: (k: string, v: unknown) => void }).setOptionValue(
      key,
      value
    );
  }
  return cmd;
}

describe('telemetry/command-context', () => {
  it('extends instructions path with artifact id', () => {
    const cmd = makeInstructionsCommand(['proposal']);
    expect(resolveTelemetryCommandPath('instructions', cmd)).toBe('instructions:proposal');
  });

  it('extends instructions apply path', () => {
    const cmd = makeInstructionsCommand(['apply']);
    expect(resolveTelemetryCommandPath('instructions', cmd)).toBe('instructions:apply');
  });

  it('extends instructions apply record pass path', () => {
    const cmd = makeInstructionsCommand(['apply'], { recordComprehensionPass: true });
    expect(resolveTelemetryCommandPath('instructions', cmd)).toBe('instructions:apply:record_pass');
  });

  it('extracts change_name and category from opts', () => {
    const program = new Command();
    const cmd = program.command('status').option('--change <id>', 'Change name').action(() => {});
    cmd.setOptionValue('change', 'my-change');
    const context = buildCommandTelemetryContext(cmd);
    expect(context.change_name).toBe('my-change');
    expect(context.command_category).toBe('diagnostic');
  });

  it('marks workflow commands as workflow category', () => {
    const program = new Command();
    const cmd = program.command('new').command('change').action(() => {});
    const context = buildCommandTelemetryContext(cmd);
    expect(context.command_category).toBe('workflow');
  });
});
