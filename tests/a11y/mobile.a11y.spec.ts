import { test, expect } from '@fixtures';
import {
  mobileA11yThresholds,
  mobileA11yCoreControlSelectors
} from '@test-helpers/constants/mobile-a11y';

/**
 * Overview: Mobile-focused accessibility checks for tap targets, reflow behavior, and hidden menu semantics.
 * Summary: Validates touch sizing/spacing, text-zoom layout stability, and screen-reader readability for collapsed/expanded menus.
 */

test.use({ seedData: true });

test.describe('mobile accessibility @a11y @mobile', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test.afterEach(async ({ homePage }) => {
    await homePage.clearDocumentTextScale();
  });

  test.describe('positive cases', () => {
    test('A11Y-MOB-P01: tap targets meet baseline size and avoid overlap @a11y @mobile @smoke', async ({
      homePage
    }) => {
      const targets = await homePage.getNavigationTapTargetMetrics();
      expect(targets.length).toBeGreaterThan(0);

      const undersized = await homePage.getTapTargetSizeViolations(
        mobileA11yThresholds.tapTargetMinPx
      );
      expect(undersized).toEqual([]);

      const overlapping = await homePage.getOverlappingNavigationTapTargetPairs();
      expect(overlapping).toEqual([]);
    });

    test('A11Y-MOB-P02: default mobile layout reflows without horizontal overflow @a11y @mobile @regression', async ({
      homePage
    }) => {
      const overflowPx = await homePage.getHorizontalOverflowPx();
      expect(overflowPx).toBeLessThanOrEqual(mobileA11yThresholds.maxHorizontalOverflowPx);

      const offscreenControls = await homePage.getOffscreenControlLabels(mobileA11yCoreControlSelectors);
      expect(offscreenControls).toEqual([]);
    });

    test('A11Y-MOB-P03: hidden QA menu stays non-readable when collapsed @a11y @mobile @regression', async ({
      homePage
    }) => {
      if (!(await homePage.hasHiddenQaMenu())) {
        test.skip(true, 'Hidden QA menu is not available in this environment.');
      }

      const collapsed = await homePage.getHiddenQaMenuState();
      expect(collapsed.triggerVisible).toBe(true);
      expect(collapsed.triggerInteractive).toBe(true);
      expect(collapsed.triggerName.length).toBeGreaterThan(0);
      expect(collapsed.panelVisible).toBe(false);
      expect(
        collapsed.panelDisplay === 'none' || collapsed.panelAriaHidden === 'true'
      ).toBe(true);
    });
  });

  test.describe('negative cases', () => {
    test('A11Y-MOB-N01: compact navigation controls keep minimum spacing for touch @a11y @mobile @regression', async ({
      homePage
    }) => {
      const crowdedPairs = await homePage.getCrowdedNavigationTapTargetPairs(
        mobileA11yThresholds.tapTargetSpacingMinPx,
        60
      );
      expect(crowdedPairs).toEqual([]);
    });

    test('A11Y-MOB-N02: 200% text scale does not break reflow for core controls @a11y @mobile @regression', async ({
      homePage
    }) => {
      await homePage.setDocumentTextScale(mobileA11yThresholds.reflowTextScalePercent);

      const overflowPx = await homePage.getHorizontalOverflowPx();
      expect(overflowPx).toBeLessThanOrEqual(mobileA11yThresholds.maxHorizontalOverflowPx);

      const offscreenControls = await homePage.getOffscreenControlLabels(mobileA11yCoreControlSelectors);
      expect(offscreenControls).toEqual([]);
    });

    test('A11Y-MOB-N03: hidden QA menu links remain readable when expanded @a11y @mobile @regression', async ({
      page,
      homePage,
      runA11y,
      expectNoA11yViolations
    }) => {
      if (!(await homePage.hasHiddenQaMenu())) {
        test.skip(true, 'Hidden QA menu is not available in this environment.');
      }

      await homePage.openHiddenQaMenu();
      const expanded = await homePage.getHiddenQaMenuState();
      expect(expanded.panelVisible).toBe(true);

      const linkNames = await homePage.getHiddenQaMenuLinkNames();
      expect(linkNames.length).toBeGreaterThan(0);
      expect(linkNames.every((name) => name.length > 2)).toBe(true);

      const results = await runA11y(page, {
        include: homePage.getHiddenQaMenuIncludeSelectors(),
        waitForNetworkIdle: false
      });
      expectNoA11yViolations(results);
    });
  });

  test.describe('edge cases', () => {
    test('A11Y-MOB-E01: landscape orientation keeps tap targets above edge threshold @a11y @mobile @regression', async ({
      page,
      homePage
    }) => {
      const viewport = page.viewportSize();
      expect(viewport).toBeTruthy();
      await page.setViewportSize({ width: viewport!.height, height: viewport!.width });
      await homePage.goto();

      const undersized = await homePage.getTapTargetSizeViolations(
        mobileA11yThresholds.tapTargetEdgeMinPx
      );
      expect(undersized).toEqual([]);

      const crowdedPairs = await homePage.getCrowdedNavigationTapTargetPairs(
        mobileA11yThresholds.tapTargetSpacingEdgeMinPx,
        60
      );
      expect(crowdedPairs).toEqual([]);
    });

    test('A11Y-MOB-E02: 250% text scale in landscape keeps controls reflow-safe @a11y @mobile @regression', async ({
      page,
      homePage
    }) => {
      const viewport = page.viewportSize();
      expect(viewport).toBeTruthy();
      await page.setViewportSize({ width: viewport!.height, height: viewport!.width });
      await homePage.goto();
      await homePage.setDocumentTextScale(mobileA11yThresholds.reflowEdgeTextScalePercent);

      const overflowPx = await homePage.getHorizontalOverflowPx();
      expect(overflowPx).toBeLessThanOrEqual(mobileA11yThresholds.maxHorizontalOverflowPx);

      const offscreenControls = await homePage.getOffscreenControlLabels(mobileA11yCoreControlSelectors);
      expect(offscreenControls).toEqual([]);
    });

    test('A11Y-MOB-E03: hidden QA menu preserves accessibility after toggle cycle @a11y @mobile @regression', async ({
      homePage
    }) => {
      if (!(await homePage.hasHiddenQaMenu())) {
        test.skip(true, 'Hidden QA menu is not available in this environment.');
      }

      await homePage.openHiddenQaMenu();
      let state = await homePage.getHiddenQaMenuState();
      expect(state.panelVisible).toBe(true);

      await homePage.closeHiddenQaMenu();
      state = await homePage.getHiddenQaMenuState();
      expect(state.panelVisible).toBe(false);

      await homePage.openHiddenQaMenu();
      const linkNames = await homePage.getHiddenQaMenuLinkNames();
      expect(linkNames.length).toBeGreaterThan(0);
    });
  });
});
