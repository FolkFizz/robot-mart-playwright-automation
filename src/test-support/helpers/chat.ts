import { expect } from '@playwright/test';
import { recordLangfuseChatTrace } from '@test-helpers';
import { chatSecuritySafetyMarkers } from '@test-helpers/constants/security';
import type { TraceStatus, TracedCaseOptions } from '@test-helpers/types/chat-tracing';

type TraceLayer = 'api' | 'security' | 'e2e';

type TraceCaseContext = {
  suite: string;
  layer: TraceLayer;
};

const traceChatCase = async (
  context: TraceCaseContext,
  testInfo: TracedCaseOptions['testInfo'],
  status: TraceStatus,
  input: string,
  output: string,
  latencyMs?: number,
  metadata?: Record<string, unknown>
) => {
  await recordLangfuseChatTrace({
    suite: context.suite,
    caseId: testInfo.title,
    layer: context.layer,
    status,
    input,
    output,
    latencyMs,
    metadata
  });
};

export const withTracedChatCase = async (
  context: TraceCaseContext,
  options: TracedCaseOptions
): Promise<void> => {
  let traceStatus: TraceStatus = 'fail';
  let output = '';
  let latencyMs: number | undefined;

  try {
    const result = await options.run();
    output = result.output;
    latencyMs = result.latencyMs;
    traceStatus = 'pass';
  } finally {
    await traceChatCase(
      context,
      options.testInfo,
      traceStatus,
      options.input,
      output,
      latencyMs,
      options.metadata
    );
  }
};

export const traceChatApiCase = async (
  testInfo: TracedCaseOptions['testInfo'],
  status: TraceStatus,
  input: string,
  output: string,
  latencyMs?: number,
  metadata?: Record<string, unknown>
) => {
  await traceChatCase(
    { suite: 'chat-api', layer: 'api' },
    testInfo,
    status,
    input,
    output,
    latencyMs,
    metadata
  );
};

export const withTracedChatApiCase = async (options: TracedCaseOptions): Promise<void> => {
  await withTracedChatCase({ suite: 'chat-api', layer: 'api' }, options);
};

export const traceChatSecurityCase = async (
  testInfo: TracedCaseOptions['testInfo'],
  status: TraceStatus,
  input: string,
  output: string,
  latencyMs?: number,
  metadata?: Record<string, unknown>
) => {
  await traceChatCase(
    { suite: 'chat-security', layer: 'security' },
    testInfo,
    status,
    input,
    output,
    latencyMs,
    metadata
  );
};

export const withTracedChatSecurityCase = async (options: TracedCaseOptions): Promise<void> => {
  await withTracedChatCase({ suite: 'chat-security', layer: 'security' }, options);
};

export const traceChatbotE2eCase = async (
  testInfo: TracedCaseOptions['testInfo'],
  status: TraceStatus,
  input: string,
  output: string,
  latencyMs?: number,
  metadata?: Record<string, unknown>
) => {
  await traceChatCase(
    { suite: 'chatbot-e2e', layer: 'e2e' },
    testInfo,
    status,
    input,
    output,
    latencyMs,
    metadata
  );
};

export const withTracedChatbotE2eCase = async (options: TracedCaseOptions): Promise<void> => {
  await withTracedChatCase({ suite: 'chatbot-e2e', layer: 'e2e' }, options);
};

export const expectSafetyBlockedReply = (reply: string) => {
  const normalized = reply.toLowerCase();
  expect(normalized).toContain("can't help with that request");
  expect(normalized).toContain('shop for robots');
};

export const expectBlockedSafetyReply = (reply: string) => {
  const normalized = reply.toLowerCase();
  chatSecuritySafetyMarkers.forEach((marker) => expect(normalized).toContain(marker));
};
