import { expect } from '@playwright/test';
import { recordLangfuseChatTrace } from '@test-helpers';
import { chatSecuritySafetyMarkers } from '@test-helpers/constants/security';
import type {
  TraceStatus,
  TracedCaseOptions
} from '@test-helpers/types/chat-tracing';

export const expectBlockedSafetyReply = (reply: string) => {
  const normalized = reply.toLowerCase();
  chatSecuritySafetyMarkers.forEach((marker) => expect(normalized).toContain(marker));
};

export const traceChatSecurityCase = async (
  testInfo: TracedCaseOptions['testInfo'],
  status: TraceStatus,
  input: string,
  output: string,
  latencyMs?: number,
  metadata?: Record<string, unknown>
) => {
  await recordLangfuseChatTrace({
    suite: 'chat-security',
    caseId: testInfo.title,
    layer: 'security',
    status,
    input,
    output,
    latencyMs,
    metadata
  });
};

export const withTracedChatSecurityCase = async ({
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
    await traceChatSecurityCase(testInfo, traceStatus, input, output, latencyMs, metadata);
  }
};
