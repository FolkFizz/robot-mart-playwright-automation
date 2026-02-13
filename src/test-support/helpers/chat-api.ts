import { expect } from '@playwright/test';
import { recordLangfuseChatTrace } from '@test-helpers';
import type {
  TraceStatus,
  TracedCaseOptions
} from '@test-helpers/types/chat-tracing';

export const traceChatApiCase = async (
  testInfo: TracedCaseOptions['testInfo'],
  status: TraceStatus,
  input: string,
  output: string,
  latencyMs?: number,
  metadata?: Record<string, unknown>
) => {
  await recordLangfuseChatTrace({
    suite: 'chat-api',
    caseId: testInfo.title,
    layer: 'api',
    status,
    input,
    output,
    latencyMs,
    metadata
  });
};

export const withTracedChatApiCase = async ({
  testInfo,
  input,
  metadata,
  run
}: TracedCaseOptions): Promise<void> => {
  let traceStatus: TraceStatus = 'fail';
  let output = '';
  let latencyMs: number | undefined;

  try {
    const result = await run();
    output = result.output;
    latencyMs = result.latencyMs;
    traceStatus = 'pass';
  } finally {
    await traceChatApiCase(testInfo, traceStatus, input, output, latencyMs, metadata);
  }
};

export const expectSafetyBlockedReply = (reply: string) => {
  const normalized = reply.toLowerCase();
  expect(normalized).toContain("can't help with that request");
  expect(normalized).toContain('shop for robots');
};
