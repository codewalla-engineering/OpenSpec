/**
 * Default telemetry identity for tests. Individual tests may delete
 * OPENSPEC_TELEMETRY_USER to exercise the identity gate.
 */
if (!process.env.OPENSPEC_TELEMETRY_USER) {
  process.env.OPENSPEC_TELEMETRY_USER = 'test@codewalla.com';
}
