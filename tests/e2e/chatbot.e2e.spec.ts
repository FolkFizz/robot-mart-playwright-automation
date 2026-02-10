import type { TestInfo } from '@playwright/test';
import { test, expect, loginAndSyncSession } from '@fixtures';
import { routes } from '@config';
import { seededProducts } from '@data';
import { isLangfuseEnabled, recordLangfuseChatTrace } from '../helpers/langfuse';

/**
 * =============================================================================
 * CHATBOT E2E TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Widget interaction flow (open/close, input/send)
 * 2. Message rendering for user and bot turns
 * 3. Error handling and resilience on network/API failures
 * 4. Multi-turn and long-message UI behavior
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - CHAT-E2E-P01: chat widget opens and closes from home page
 *   - CHAT-E2E-P02: sending a message renders user and bot messages
 *   - CHAT-E2E-P03: pressing Enter submits chat message
 *
 * NEGATIVE CASES (3 tests):
 *   - CHAT-E2E-N01: whitespace-only input is ignored
 *   - CHAT-E2E-N02: network abort shows fallback error message
 *   - CHAT-E2E-N03: malformed server response shows fallback error message
 *
 * EDGE CASES (3 tests):
 *   - CHAT-E2E-E01: long user message is rendered and input is cleared
 *   - CHAT-E2E-E02: multi-turn conversation keeps message history
 *   - CHAT-E2E-E03: widget remains available after page navigation
 *
 * =============================================================================
 */

const traceCase = async (
  testInfo: TestInfo,
  status: 'pass' | 'fail',
  input: string,
  output: string,
  latencyMs?: number,
  metadata?: Record<string, unknown>
) => {
  await recordLangfuseChatTrace({
    suite: 'chatbot-e2e',
    caseId: testInfo.title,
    layer: 'e2e',
    status,
    input,
    output,
    latencyMs,
    metadata
  });
};

test.use({ seedData: true });

test.describe('chatbot e2e @e2e @chat', () => {
  test.beforeAll(() => {
    if (isLangfuseEnabled()) {
      console.log('[chatbot-e2e] Langfuse tracing is enabled for this run.');
    }
  });

  test.beforeEach(async ({ api, page, homePage }) => {
    await loginAndSyncSession(api, page);
    await homePage.goto();
  });

  test.describe('positive cases', () => {
    test('CHAT-E2E-P01: chat widget opens and closes from home page @e2e @chat @smoke', async ({ chatWidgetPage }, testInfo) => {
      const input = 'widget-open-close';
      let output = '';
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await chatWidgetPage.expectToggleVisible();
        await chatWidgetPage.expectWindowHidden();

        await chatWidgetPage.open();
        await chatWidgetPage.close();

        output = 'open-close-success';
        traceStatus = 'pass';
      } finally {
        await traceCase(testInfo, traceStatus, input, output);
      }
    });

    test('CHAT-E2E-P02: sending a message renders user and bot messages @e2e @chat @regression', async ({ chatWidgetPage }, testInfo) => {
      const input = 'Can you recommend a starter robot?';
      let output = '';
      let latencyMs = 0;
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await chatWidgetPage.open();

        const started = Date.now();
        await chatWidgetPage.sendMessage(input, 'click');
        output = await chatWidgetPage.waitForBotReplyAfterUserMessage(input);
        latencyMs = Date.now() - started;

        traceStatus = 'pass';
      } finally {
        await traceCase(testInfo, traceStatus, input, output, latencyMs);
      }
    });

    test('CHAT-E2E-P03: pressing Enter submits chat message @e2e @chat @regression', async ({ chatWidgetPage }, testInfo) => {
      const input = 'Testing submit by Enter key';
      let output = '';
      let latencyMs = 0;
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await chatWidgetPage.open();

        const started = Date.now();
        await chatWidgetPage.sendMessage(input, 'enter');
        output = await chatWidgetPage.waitForBotReplyAfterUserMessage(input);
        latencyMs = Date.now() - started;

        traceStatus = 'pass';
      } finally {
        await traceCase(testInfo, traceStatus, input, output, latencyMs, { submitMode: 'enter' });
      }
    });
  });

  test.describe('negative cases', () => {
    test('CHAT-E2E-N01: whitespace-only input is ignored @e2e @chat @regression', async ({ chatWidgetPage }, testInfo) => {
      const input = '   ';
      let output = '';
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await chatWidgetPage.open();

        const userCountBefore = await chatWidgetPage.getUserMessageCount();
        await chatWidgetPage.sendMessage(input, 'click');
        await chatWidgetPage.sleep(300);

        const userCountAfter = await chatWidgetPage.getUserMessageCount();
        expect(userCountAfter).toBe(userCountBefore);

        output = `userCountBefore=${userCountBefore}; userCountAfter=${userCountAfter}`;
        traceStatus = 'pass';
      } finally {
        await traceCase(testInfo, traceStatus, 'whitespace-input', output);
      }
    });

    test('CHAT-E2E-N02: network abort shows fallback error message @e2e @chat @regression', async ({ page, chatWidgetPage }, testInfo) => {
      const input = 'Will fail due to network abort';
      let output = '';
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await page.route(routes.api.chat, async (route) => {
          await route.abort('failed');
        });

        await chatWidgetPage.open();
        await chatWidgetPage.sendMessage(input, 'click');

        await chatWidgetPage.expectLatestBotMessageContains('Connection Error');
        output = await chatWidgetPage.getLatestBotMessageText();
        traceStatus = 'pass';
      } finally {
        await page.unroute(routes.api.chat);
        await traceCase(testInfo, traceStatus, input, output, undefined, { failureMode: 'network-abort' });
      }
    });

    test('CHAT-E2E-N03: malformed server response shows fallback error message @e2e @chat @regression', async ({ page, chatWidgetPage }, testInfo) => {
      const input = 'Will fail due to malformed response';
      let output = '';
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await page.route(routes.api.chat, async (route) => {
          await route.fulfill({
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: 'not-json-response'
          });
        });

        await chatWidgetPage.open();
        await chatWidgetPage.sendMessage(input, 'click');

        await chatWidgetPage.expectLatestBotMessageContains('Connection Error');
        output = await chatWidgetPage.getLatestBotMessageText();
        traceStatus = 'pass';
      } finally {
        await page.unroute(routes.api.chat);
        await traceCase(testInfo, traceStatus, input, output, undefined, { failureMode: 'malformed-json' });
      }
    });
  });

  test.describe('edge cases', () => {
    test('CHAT-E2E-E01: long user message is rendered and input is cleared @e2e @chat @regression', async ({ chatWidgetPage }, testInfo) => {
      const input = `Need advice: ${'robot '.repeat(80)}`.trim();
      let output = '';
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await chatWidgetPage.open();
        await chatWidgetPage.sendMessage(input, 'click');
        output = await chatWidgetPage.waitForBotReplyAfterUserMessage('Need advice:');

        await chatWidgetPage.expectInputCleared();
        traceStatus = 'pass';
      } finally {
        await traceCase(testInfo, traceStatus, 'long-message', output, undefined, { inputLength: input.length });
      }
    });

    test('CHAT-E2E-E02: multi-turn conversation keeps message history @e2e @chat @regression', async ({ chatWidgetPage }, testInfo) => {
      const firstInput = 'First question: do you have starter bots?';
      const secondInput = 'Second question: and maybe low maintenance?';
      let output = '';
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await chatWidgetPage.open();

        await chatWidgetPage.sendMessage(firstInput, 'click');
        const firstReply = await chatWidgetPage.waitForBotReplyAfterUserMessage(firstInput);

        await chatWidgetPage.sendMessage(secondInput, 'click');
        const secondReply = await chatWidgetPage.waitForBotReplyAfterUserMessage(secondInput);

        const userCount = await chatWidgetPage.getUserMessageCount();
        expect(userCount).toBeGreaterThanOrEqual(2);

        output = `${firstReply} | ${secondReply}`;
        traceStatus = 'pass';
      } finally {
        await traceCase(testInfo, traceStatus, 'multi-turn', output);
      }
    });

    test('CHAT-E2E-E03: widget remains available after page navigation @e2e @chat @regression', async ({ productPage, chatWidgetPage }, testInfo) => {
      const input = 'navigation-availability';
      let output = '';
      let traceStatus: 'pass' | 'fail' = 'fail';

      try {
        await productPage.gotoById(seededProducts[0].id);

        await chatWidgetPage.expectToggleVisible();
        await chatWidgetPage.open();
        await chatWidgetPage.expectFirstBotMessageVisible();

        output = 'chat-widget-visible-on-product-page';
        traceStatus = 'pass';
      } finally {
        await traceCase(testInfo, traceStatus, input, output, undefined, { navigatedTo: routes.productDetail(seededProducts[0].id) });
      }
    });
  });
});
