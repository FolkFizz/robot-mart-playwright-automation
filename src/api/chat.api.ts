import { APIRequestContext, APIResponse, expect } from '@playwright/test';
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

  async postJson(message?: string): Promise<ChatApiResult> {
    const started = Date.now();
    const res = await this.ctx.post(routes.api.chat, {
      data: message === undefined ? {} : { message },
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

  async postForm(message: string): Promise<ChatApiResult> {
    const started = Date.now();
    const res = await this.ctx.post(routes.api.chat, {
      form: { message },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
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

  async getEndpoint(): Promise<APIResponse> {
    return await this.ctx.get(routes.api.chat, { maxRedirects: 0 });
  }

  // Backward-compatible alias used by live canary tests.
  async postMessage(message: string): Promise<ChatApiResult> {
    return await this.postJson(message);
  }
}
