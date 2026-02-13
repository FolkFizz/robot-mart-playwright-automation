import type { TestInfo } from '@playwright/test';

export type TraceStatus = 'pass' | 'fail';

export type TracedCaseResult = {
  output: string;
  latencyMs?: number;
};

export type TracedCaseOptions = {
  testInfo: TestInfo;
  input: string;
  metadata?: Record<string, unknown>;
  run: () => Promise<TracedCaseResult>;
};
