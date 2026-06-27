/**
 * Command-level telemetry context from CLI invocation.
 */
import type { Command } from 'commander';

export type CommandCategory = 'workflow' | 'diagnostic';

const DIAGNOSTIC_COMMANDS = new Set([
  'status',
  'list',
  'show',
  'doctor',
  'context',
  'validate',
  'templates',
  'schemas',
  'view',
  'completion',
]);

export interface CommandTelemetryContext {
  change_name?: string;
  schema?: string;
  command_category?: CommandCategory;
}

export function resolveTelemetryCommandPath(basePath: string, actionCommand: Command): string {
  if (basePath !== 'instructions') {
    return basePath;
  }

  const args = actionCommand.args as string[] | undefined;
  const artifact = args?.[0];
  const opts = actionCommand.opts() as {
    recordComprehensionPass?: boolean;
  };

  if (artifact === 'apply') {
    if (opts.recordComprehensionPass) {
      return 'instructions:apply:record_pass';
    }
    return 'instructions:apply';
  }

  if (artifact) {
    return `instructions:${artifact}`;
  }

  return basePath;
}

export function buildCommandTelemetryContext(actionCommand: Command): CommandTelemetryContext {
  const opts = actionCommand.opts() as {
    change?: string;
    schema?: string;
  };
  const basePath = actionCommand.name();
  const rootCommand = resolveRootCommandName(actionCommand);
  const commandPath = rootCommand ?? basePath;

  const context: CommandTelemetryContext = {};

  if (opts.change) {
    context.change_name = opts.change;
  }
  if (opts.schema) {
    context.schema = opts.schema;
  }

  const categoryKey = commandPath.split(':')[0] ?? commandPath;
  context.command_category = DIAGNOSTIC_COMMANDS.has(categoryKey) ? 'diagnostic' : 'workflow';

  return context;
}

function resolveRootCommandName(command: Command): string | undefined {
  const names: string[] = [];
  let current: Command | null = command;

  while (current) {
    const name = current.name();
    if (name && name !== 'openspec') {
      names.unshift(name);
    }
    current = current.parent;
  }

  return names.join(':') || undefined;
}
