import { test, expect, loginAndSyncSession } from '@fixtures';
import { routes } from '@config';
import { seededProducts } from '@data';
import { isLangfuseEnabled } from '@test-helpers';
import { withTracedChatbotE2eCase as withTracedCase } from '@test-helpers/helpers/chat';

/**
 * Overview: End-to-end chatbot widget validation for user interaction and response rendering.
 * Summary: Covers open/close UX, send actions, multi-turn history, and graceful fallback behavior under route-level failures.
 */

test.use({ seedData: true });

test.describe('chatbot e2e @e2e @chat @ai @ai-mock', () => {
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
    test('CHAT-E2E-P01: chat widget opens and closes from home page @e2e @chat @smoke', async ({
      chatWidgetPage
    }, testInfo) => {
      await withTracedCase({
        testInfo,
        input: 'widget-open-close',
        run: async () => {
          // Act: Open and close chat widget.
          await chatWidgetPage.expectToggleVisible();
          await chatWidgetPage.expectWindowHidden();
          await chatWidgetPage.open();
          await chatWidgetPage.close();

          // Assert: Flow completes without widget failures.
          return { output: 'open-close-success' };
        }
      });
    });

    test('CHAT-E2E-P02: sending a message renders user and bot messages @e2e @chat @regression', async ({
      chatWidgetPage
    }, testInfo) => {
      const input = 'Can you recommend a starter robot?';

      await withTracedCase({
        testInfo,
        input,
        run: async () => {
          // Act: Open widget and send message by click.
          await chatWidgetPage.open();
          const started = Date.now();
          await chatWidgetPage.sendMessage(input, 'click');
          const output = await chatWidgetPage.waitForBotReplyAfterUserMessage(input);

          // Assert: Bot reply appears after user message.
          return { output, latencyMs: Date.now() - started };
        }
      });
    });

    test('CHAT-E2E-P03: pressing Enter submits chat message @e2e @chat @regression', async ({
      chatWidgetPage
    }, testInfo) => {
      const input = 'Testing submit by Enter key';

      await withTracedCase({
        testInfo,
        input,
        metadata: { submitMode: 'enter' },
        run: async () => {
          // Act: Open widget and submit message via Enter.
          await chatWidgetPage.open();
          const started = Date.now();
          await chatWidgetPage.sendMessage(input, 'enter');
          const output = await chatWidgetPage.waitForBotReplyAfterUserMessage(input);

          // Assert: Submit-by-enter keeps same behavior contract.
          return { output, latencyMs: Date.now() - started };
        }
      });
    });
  });

  test.describe('negative cases', () => {
    test('CHAT-E2E-N01: whitespace-only input is ignored @e2e @chat @regression', async ({
      chatWidgetPage
    }, testInfo) => {
      await withTracedCase({
        testInfo,
        input: 'whitespace-input',
        run: async () => {
          // Act: Send whitespace-only input.
          await chatWidgetPage.open();
          const userCountBefore = await chatWidgetPage.getUserMessageCount();
          await chatWidgetPage.sendMessage('   ', 'click');
          await chatWidgetPage.expectUserMessageCount(userCountBefore, 2_000);
          const userCountAfter = await chatWidgetPage.getUserMessageCount();

          // Assert: User message count does not change.
          expect(userCountAfter).toBe(userCountBefore);
          return { output: `userCountBefore=${userCountBefore}; userCountAfter=${userCountAfter}` };
        }
      });
    });

    test('CHAT-E2E-N02: network abort shows fallback error message @e2e @chat @regression', async ({
      page,
      chatWidgetPage
    }, testInfo) => {
      const input = 'Will fail due to network abort';

      await withTracedCase({
        testInfo,
        input,
        metadata: { failureMode: 'network-abort' },
        run: async () => {
          // Arrange: Force chat endpoint network abort.
          await page.route(routes.api.chat, async (route) => {
            await route.abort('failed');
          });

          try {
            // Act: Send chat message under forced network failure.
            await chatWidgetPage.open();
            await chatWidgetPage.sendMessage(input, 'click');
            await chatWidgetPage.expectLatestBotMessageContains('Connection Error');

            // Assert: Fallback error message is shown.
            return { output: await chatWidgetPage.getLatestBotMessageText() };
          } finally {
            await page.unroute(routes.api.chat);
          }
        }
      });
    });

    test('CHAT-E2E-N03: malformed server response shows fallback error message @e2e @chat @regression', async ({
      page,
      chatWidgetPage
    }, testInfo) => {
      const input = 'Will fail due to malformed response';

      await withTracedCase({
        testInfo,
        input,
        metadata: { failureMode: 'malformed-json' },
        run: async () => {
          // Arrange: Force malformed backend response.
          await page.route(routes.api.chat, async (route) => {
            await route.fulfill({
              status: 500,
              headers: { 'Content-Type': 'text/plain' },
              body: 'not-json-response'
            });
          });

          try {
            // Act: Send chat message under malformed backend payload.
            await chatWidgetPage.open();
            await chatWidgetPage.sendMessage(input, 'click');
            await chatWidgetPage.expectLatestBotMessageContains('Connection Error');

            // Assert: UI shows fallback error message.
            return { output: await chatWidgetPage.getLatestBotMessageText() };
          } finally {
            await page.unroute(routes.api.chat);
          }
        }
      });
    });
  });

  test.describe('edge cases', () => {
    test('CHAT-E2E-E01: long user message is rendered and input is cleared @e2e @chat @regression', async ({
      chatWidgetPage
    }, testInfo) => {
      const input = `Need advice: ${'robot '.repeat(80)}`.trim();

      await withTracedCase({
        testInfo,
        input: 'long-message',
        metadata: { inputLength: input.length },
        run: async () => {
          // Act: Send long message payload.
          await chatWidgetPage.open();
          await chatWidgetPage.sendMessage(input, 'click');
          const output = await chatWidgetPage.waitForBotReplyAfterUserMessage('Need advice:');

          // Assert: Input clears after send.
          await chatWidgetPage.expectInputCleared();
          return { output };
        }
      });
    });

    test('CHAT-E2E-E02: multi-turn conversation keeps message history @e2e @chat @regression', async ({
      chatWidgetPage
    }, testInfo) => {
      const firstInput = 'First question: do you have starter bots?';
      const secondInput = 'Second question: and maybe low maintenance?';

      await withTracedCase({
        testInfo,
        input: 'multi-turn',
        run: async () => {
          // Act: Complete two-turn conversation.
          await chatWidgetPage.open();
          await chatWidgetPage.sendMessage(firstInput, 'click');
          const firstReply = await chatWidgetPage.waitForBotReplyAfterUserMessage(firstInput);
          await chatWidgetPage.sendMessage(secondInput, 'click');
          const secondReply = await chatWidgetPage.waitForBotReplyAfterUserMessage(secondInput);

          // Assert: History keeps at least two user messages.
          const userCount = await chatWidgetPage.getUserMessageCount();
          expect(userCount).toBeGreaterThanOrEqual(2);
          return { output: `${firstReply} | ${secondReply}` };
        }
      });
    });

    test('CHAT-E2E-E03: widget remains available after page navigation @e2e @chat @regression', async ({
      productPage,
      chatWidgetPage
    }, testInfo) => {
      await withTracedCase({
        testInfo,
        input: 'navigation-availability',
        metadata: { navigatedTo: routes.productDetail(seededProducts[0].id) },
        run: async () => {
          // Act: Navigate away from home to product detail page.
          await productPage.gotoById(seededProducts[0].id);
          await chatWidgetPage.expectToggleVisible();
          await chatWidgetPage.open();
          await chatWidgetPage.expectFirstBotMessageVisible();

          // Assert: Widget remains usable after navigation.
          return { output: 'chat-widget-visible-on-product-page' };
        }
      });
    });
  });
});



