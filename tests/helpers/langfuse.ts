import { randomUUID } from 'crypto';

export type LangfuseLayer = 'api' | 'e2e' | 'security';
export type LangfuseCaseStatus = 'pass' | 'fail';

export type LangfuseChatTrace = {
  caseId: string;
  suite: string;
  layer: LangfuseLayer;
  status: LangfuseCaseStatus;
  input: string;
  output?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
};

const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
const secretKey = process.env.LANGFUSE_SECRET_KEY;
const baseUrl = (process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(/\/+$/, '');

const enabled = Boolean(publicKey && secretKey);
const authHeader = enabled
  ? `Basic ${Buffer.from(`${publicKey}:${secretKey}`, 'utf-8').toString('base64')}`
  : '';

export const isLangfuseEnabled = (): boolean => enabled;

export const recordLangfuseChatTrace = async (trace: LangfuseChatTrace): Promise<void> => {
  if (!enabled) return;

  const traceId = randomUUID();
  const observationId = randomUUID();
  const scoreId = randomUUID();
  const now = new Date().toISOString();

  const body = {
    batch: [
      {
        id: randomUUID(),
        timestamp: now,
        type: 'trace-create',
        body: {
          id: traceId,
          name: `${trace.suite}:${trace.caseId}`,
          input: trace.input,
          output: trace.output ?? '',
          metadata: {
            layer: trace.layer,
            status: trace.status,
            latencyMs: trace.latencyMs ?? null,
            ...(trace.metadata ?? {})
          }
        }
      },
      {
        id: randomUUID(),
        timestamp: now,
        type: 'observation-create',
        body: {
          id: observationId,
          traceId,
          type: 'generation',
          name: 'chat-response',
          input: trace.input,
          output: trace.output ?? '',
          metadata: {
            layer: trace.layer
          }
        }
      },
      {
        id: randomUUID(),
        timestamp: now,
        type: 'score-create',
        body: {
          id: scoreId,
          traceId,
          observationId,
          name: 'automation_assertion',
          value: trace.status === 'pass' ? 1 : 0,
          comment: trace.status
        }
      }
    ],
    metadata: {
      sdk_integration: 'playwright-chat-tests',
      sdk_name: 'robot-store-playwright-automation'
    }
  };

  try {
    const response = await fetch(`${baseUrl}/api/public/ingestion`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      // Keep tests non-blocking even if tracing backend is unavailable/misconfigured.
      console.warn(`[langfuse] ingestion failed (${response.status}): ${text}`);
    }
  } catch (err) {
    console.warn(`[langfuse] ingestion error: ${String(err)}`);
  }
};

