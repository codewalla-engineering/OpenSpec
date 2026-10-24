/**
 * Auto-detect who invoked the CLI (human, agent, CI).
 */

function detectDevinEnv(): boolean {
  return Object.keys(process.env).some((key) => key.startsWith('DEVIN'));
}

function detectCursorAgentEnv(): boolean {
  return Boolean(process.env.CURSOR_AGENT || process.env.CURSOR_SESSION_ID);
}

/**
 * Caller detection from env signals only — never consults OPENSPEC_CALLER.
 * Used for enforcement and attribution (e.g. comprehension pass recording)
 * where the override would be a spoof vector. Not cryptographic: a determined
 * process can scrub its env, but this is honest default-deny.
 */
export function detectCaller(): string {
  if (detectDevinEnv()) {
    return 'devin';
  }
  if (detectCursorAgentEnv()) {
    return 'cursor-agent';
  }
  if (process.env.CI === 'true') {
    return 'ci';
  }
  if (!process.stdin.isTTY) {
    return 'automation';
  }
  return 'human';
}

export function resolveCaller(): string {
  const override = process.env.OPENSPEC_CALLER?.trim();
  if (override) {
    return override;
  }
  return detectCaller();
}
