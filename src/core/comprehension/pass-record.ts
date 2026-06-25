import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

export const COMPREHENSION_PASS_FILENAME = '.comprehension-pass.yaml';
export const COMPREHENSION_SESSION_FILENAME = '.comprehension-session.yaml';

const PassRecordSchema = z.object({
  version: z.literal(1),
  passed: z.literal(true),
  score_percent: z.number().int().min(0).max(100),
  threshold_percent: z.number().int().min(0).max(100),
  attempt: z.number().int().positive(),
  question_count: z.number().int().positive(),
  spec_fingerprint: z.string().min(1),
  passed_at: z.string().min(1),
});

export type ComprehensionPassRecord = z.infer<typeof PassRecordSchema>;

export function passRecordPath(changeDir: string): string {
  return path.join(changeDir, COMPREHENSION_PASS_FILENAME);
}

export function sessionRecordPath(changeDir: string): string {
  return path.join(changeDir, COMPREHENSION_SESSION_FILENAME);
}

export function readPassRecord(changeDir: string): ComprehensionPassRecord | null {
  const filePath = passRecordPath(changeDir);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = parseYaml(readFileSync(filePath, 'utf-8'));
    const result = PassRecordSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function writePassRecord(changeDir: string, record: ComprehensionPassRecord): void {
  writeFileSync(passRecordPath(changeDir), stringifyYaml(record), 'utf-8');
}

export function deleteSessionRecord(changeDir: string): void {
  const filePath = sessionRecordPath(changeDir);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

export function isPassValid(
  record: ComprehensionPassRecord | null,
  currentFingerprint: string
): boolean {
  if (!record?.passed) {
    return false;
  }
  return record.spec_fingerprint === currentFingerprint;
}

export function buildPassRecord(input: {
  scorePercent: number;
  thresholdPercent: number;
  attempt: number;
  questionCount: number;
  specFingerprint: string;
}): ComprehensionPassRecord {
  return {
    version: 1,
    passed: true,
    score_percent: input.scorePercent,
    threshold_percent: input.thresholdPercent,
    attempt: input.attempt,
    question_count: input.questionCount,
    spec_fingerprint: input.specFingerprint,
    passed_at: new Date().toISOString(),
  };
}
