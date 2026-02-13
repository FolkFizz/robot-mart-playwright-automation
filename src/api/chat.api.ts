import { APIRequestContext, expect } from '@playwright/test';
import { routes } from '@config/constants';

export type ChatApiResponse = {
  reply: string;
};

export type ChatApiResult = {
  status: number;
  body: ChatApiResponse;
  latencyMs: number;
};

const isReplyShape = (value: unknown): value is ChatApiResponse => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'reply' in value &&
      typeof (value as { reply: unknown }).reply === 'string'
  );
};

// API Page Object/Client for chatbot endpoints.
export class ChatApiClient {
  constructor(private readonly ctx: APIRequestContext) {}

  async postMessage(message: string): Promise<ChatApiResult> {
    const started = Date.now();
    const res = await this.ctx.post(routes.api.chat, {
      data: { message },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      maxRedirects: 0
    });
    const latencyMs = Date.now() - started;

    const body = (await res.json()) as unknown;
    expect(isReplyShape(body)).toBe(true);

    return {
      status: res.status(),
      body: body as ChatApiResponse,
      latencyMs
    };
  }
}
