import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/constants';
import { parseMoney } from '@utils/money';

type TapTargetMetric = {
  label: string;
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type TapTargetPair = {
  first: string;
  second: string;
  distance: number;
};

type HiddenMenuState = {
  triggerVisible: boolean;
  triggerName: string;
  triggerTag: string | null;
  triggerRole: string | null;
  triggerInteractive: boolean;
  triggerExpanded: string | null;
  panelVisible: boolean;
  panelDisplay: string | null;
  panelAriaHidden: string | null;
};

// Page object model for Home/Catalog page.
export class HomePage extends BasePage {
  private readonly searchInput: Locator;
  private readonly sortSelect: Locator;
  private readonly minPriceInput: Locator;
  private readonly maxPriceInput: Locator;
  private readonly applyFilterButton: Locator;
  private readonly categoryList: Locator;
  private readonly emptyState: Locator;
  private readonly navigation: Locator;
  private readonly headingAllProducts: Locator;
  private readonly qaToolsTrigger: Locator;
  private readonly qaToolsMenuPanel: Locator;

  constructor(page: Page) {
    super(page);
    // Search input on the home page.
    this.searchInput = this.page.getByPlaceholder('Search models...');
    // dropdown sort
    this.sortSelect = this.page.locator('.sort-select');
    // price filters
    this.minPriceInput = this.page.locator('input.filter-input[name="minPrice"]');
    this.maxPriceInput = this.page.locator('input.filter-input[name="maxPrice"]');
    this.applyFilterButton = this.page.locator('.btn-filter');
    // category list
    this.categoryList = this.page.locator('.category-list');
    // empty state
    this.emptyState = this.page.getByText('No bots found matching your criteria.');
    this.navigation = this.page.locator('nav, .navbar, .header, [role="navigation"]').first();
    this.headingAllProducts = this.page.getByRole('heading', { name: /All Products/i });
    this.qaToolsTrigger = this.page.locator('#devMenuContainer .dropdown-trigger').first();
    this.qaToolsMenuPanel = this.page.locator('#devDropdown').first();
  }

  // Open the home page.
  async goto(): Promise<void> {
    await super.goto(routes.home);
  }

  // Open the home page with an optional query string.
  async gotoWithQuery(query: string): Promise<void> {
    if (!query) {
      await this.goto();
      return;
    }
    const suffix = query.startsWith('?') ? query : `?${query}`;
    await super.goto(`${routes.home}${suffix}`);
  }

  // Search input locator.
  getSearchInput(): Locator {
    return this.searchInput;
  }

  // Sort select locator.
  getSortSelect(): Locator {
    return this.sortSelect;
  }

  // Category list locator.
  getCategoryList(): Locator {
    return this.categoryList;
  }

  // Search products.
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.searchInput.press('Enter');
    await this.waitForNetworkIdle();
  }

  // Select a category from the sidebar (for example: automation/hazardous/high_tech/companion).
  async selectCategory(category: string): Promise<void> {
    const link = this.page.locator(`a[href="/?category=${category}"]`);
    await link.click();
    await this.waitForNetworkIdle();
  }

  // Apply sort mode (newest | price_asc | price_desc | name_asc).
  async selectSort(sortValue: string): Promise<void> {
    await this.sortSelect.selectOption(sortValue);
    const escapedSortValue = sortValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.page).toHaveURL(new RegExp(`([?&])sort=${escapedSortValue}([&#]|$)`), {
      timeout: 10_000
    });
    await this.waitForNetworkIdle();
    await this.waitForSortedResults(sortValue);
  }

  // Filter by price range.
  async applyPriceFilter(min: number | string, max: number | string): Promise<void> {
    const minValue = String(min);
    const maxValue = String(max);

    await this.minPriceInput.fill(minValue);
    await this.maxPriceInput.fill(maxValue);
    await this.applyFilterButton.click();

    const escapedMin = minValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedMax = maxValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    await expect(this.page).toHaveURL(new RegExp(`([?&])minPrice=${escapedMin}([&#]|$)`), {
      timeout: 10_000
    });
    await expect(this.page).toHaveURL(new RegExp(`([?&])maxPrice=${escapedMax}([&#]|$)`), {
      timeout: 10_000
    });

    await this.waitForNetworkIdle();

    const minNumber = Number(minValue);
    const maxNumber = Number(maxValue);
    const hasNumericRange = Number.isFinite(minNumber) && Number.isFinite(maxNumber);

    if (hasNumericRange && minNumber <= maxNumber) {
      await expect
        .poll(async () => {
          const values = await this.getVisibleProductPriceValues();
          if (values.length === 0) return true;
          return values.every((value) => value >= minNumber - 0.01 && value <= maxNumber + 0.01);
        })
        .toBe(true);
    }
  }

  private productCards(): Locator {
    return this.page.locator('[data-testid^="product-card-"]');
  }

  async waitForAnyProductCardVisible(timeoutMs = 10_000): Promise<void> {
    await this.productCards().first().waitFor({ state: 'visible', timeout: timeoutMs });
  }

  // Click a product card by index (0 = first).
  async clickProductByIndex(index: number): Promise<void> {
    await this.productCards().nth(index).click();
    await this.waitForNetworkIdle();
  }

  // Click a product card by known id.
  async clickProductById(id: number | string): Promise<void> {
    const card = this.getByTestId(`product-card-${id}`);
    try {
      await card.waitFor({ state: 'visible', timeout: 3_000 });
      await card.click();
      await this.waitForNetworkIdle();
    } catch {
      // When seeded catalog is paginated, open product detail route directly.
      await super.goto(routes.productDetail(id));
    }
  }

  private productCardRoot(id: number | string): Locator {
    return this.getByTestId(`product-card-${id}`);
  }

  async waitForProductCardVisible(id: number | string): Promise<void> {
    await this.productCardRoot(id).waitFor({ state: 'visible' });
  }

  async isProductCardVisible(id: number | string): Promise<boolean> {
    return await this.productCardRoot(id)
      .isVisible()
      .catch(() => false);
  }

  async getProductCardTitle(id: number | string): Promise<string> {
    return await this.getByTestId(`product-title-${id}`).innerText();
  }

  async expectProductCardTitleContains(
    id: number | string,
    pattern: string | RegExp
  ): Promise<void> {
    await expect(this.getByTestId(`product-title-${id}`)).toContainText(pattern);
  }

  async getProductCardPriceText(id: number | string): Promise<string> {
    return await this.getByTestId(`product-price-${id}`).innerText();
  }

  async getProductCardPriceValue(id: number | string): Promise<number> {
    return parseMoney(await this.getProductCardPriceText(id));
  }

  async getProductCardCategory(id: number | string): Promise<string> {
    return await this.productCardRoot(id).locator('.badge').innerText();
  }

  async getProductStockStatus(id: number | string): Promise<string> {
    return await this.productCardRoot(id).locator('.stock-status').innerText();
  }

  async isProductOutOfStock(id: number | string): Promise<boolean> {
    const text = (await this.getProductStockStatus(id)).toLowerCase();
    return text.includes('out of stock');
  }

  // Check whether at least one product is shown.
  async hasProducts(): Promise<boolean> {
    const count = await this.page.locator('[data-testid^="product-card-"]').count();
    return count > 0;
  }

  // Count visible products (useful for pagination checks).
  async getProductCount(): Promise<number> {
    return await this.productCards().count();
  }

  private isSortedNumberAscending(values: number[]): boolean {
    for (let i = 1; i < values.length; i += 1) {
      if (values[i] + 0.001 < values[i - 1]) return false;
    }
    return true;
  }

  private isSortedNumberDescending(values: number[]): boolean {
    for (let i = 1; i < values.length; i += 1) {
      if (values[i] > values[i - 1] + 0.001) return false;
    }
    return true;
  }

  private normalizeLabel(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private isSortedLabelAscending(values: string[]): boolean {
    const normalized = values.map((value) => this.normalizeLabel(value));
    for (let i = 1; i < normalized.length; i += 1) {
      if (normalized[i - 1].localeCompare(normalized[i]) > 0) return false;
    }
    return true;
  }

  private async waitForSortedResults(sortValue: string): Promise<void> {
    if (sortValue === 'price_asc') {
      await expect
        .poll(async () => {
          const values = await this.getVisibleProductPriceValues();
          return values.length <= 1 || this.isSortedNumberAscending(values);
        })
        .toBe(true);
      return;
    }

    if (sortValue === 'price_desc') {
      await expect
        .poll(async () => {
          const values = await this.getVisibleProductPriceValues();
          return values.length <= 1 || this.isSortedNumberDescending(values);
        })
        .toBe(true);
      return;
    }

    if (sortValue === 'name_asc') {
      await expect
        .poll(async () => {
          const values = await this.getVisibleProductTitleTexts();
          return values.length <= 1 || this.isSortedLabelAscending(values);
        })
        .toBe(true);
    }
  }

  async isNavigationVisible(): Promise<boolean> {
    return await this.navigation.isVisible().catch(() => false);
  }

  private async getVisibleTexts(selector: string): Promise<string[]> {
    return await this.page.locator(selector).evaluateAll((elements) => {
      return elements
        .filter((element) => {
          const node = element as HTMLElement;
          const style = window.getComputedStyle(node);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            node.offsetParent !== null
          );
        })
        .map((element) => (element.textContent ?? '').trim())
        .filter((text) => text.length > 0);
    });
  }

  // Read all visible product price texts.
  async getVisibleProductPriceTexts(): Promise<string[]> {
    return await this.getVisibleTexts('[data-testid^="product-price-"]');
  }

  async getVisibleProductPriceValues(): Promise<number[]> {
    const texts = await this.getVisibleProductPriceTexts();
    return texts.map((text) => parseMoney(text));
  }

  // Read all visible product title texts.
  async getVisibleProductTitleTexts(): Promise<string[]> {
    return await this.getVisibleTexts('[data-testid^="product-title-"]');
  }

  // Read the first category badge (useful for category checks).
  async getFirstBadgeText(): Promise<string> {
    return await this.page.locator('.badge').first().innerText();
  }

  async getVisibleBadgeTexts(): Promise<string[]> {
    return await this.getVisibleTexts('.badge');
  }

  // Wait for the empty state to appear.
  async waitForEmptyState(): Promise<void> {
    await this.emptyState.waitFor({ state: 'visible' });
  }

  // Check whether empty state is visible.
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false);
  }

  getA11yExcludeSelectors(): string[] {
    return [
      '.chat-toggle',
      '.reset-link',
      'h2 > span',
      '.stock-status .in-stock',
      'select.sort-select'
    ];
  }

  getContrastIncludeSelectors(): string[] {
    return [
      'input[placeholder="Search models..."]',
      'input.filter-input[name="minPrice"]',
      'input.filter-input[name="maxPrice"]',
      '.btn-filter'
    ];
  }

  async pressTabFromPageRoot(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async isFocusedElementVisible(): Promise<boolean> {
    return await this.page
      .locator(':focus')
      .isVisible()
      .catch(() => false);
  }

  async getFocusedElementTagName(): Promise<string> {
    return await this.page.locator(':focus').evaluate((el) => el.tagName.toLowerCase());
  }

  async focusSearchInput(): Promise<void> {
    await this.searchInput.focus();
  }

  async isSearchInputFocused(): Promise<boolean> {
    return await this.searchInput.evaluate((el) => el === document.activeElement);
  }

  async submitSearchWithEnter(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  async hasResultsOrEmptyState(): Promise<boolean> {
    const hasAnyResult = (await this.getProductCount()) > 0;
    const emptyStateVisible = await this.isEmptyStateVisible();
    return hasAnyResult || emptyStateVisible;
  }

  async focusFirstCategoryLink(): Promise<void> {
    await this.page.locator('.category-list a[href*="category="]').first().focus();
  }

  async isFirstCategoryLinkFocused(): Promise<boolean> {
    const categoryLink = this.page.locator('.category-list a[href*="category="]').first();
    return await categoryLink.evaluate((el) => el === document.activeElement);
  }

  async activateFocusedElement(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async focusSortSelect(): Promise<void> {
    await this.sortSelect.focus();
  }

  async isSortSelectFocused(): Promise<boolean> {
    return await this.sortSelect.evaluate((el) => el === document.activeElement);
  }

  async isCatalogHeadingVisible(): Promise<boolean> {
    return await this.headingAllProducts.isVisible().catch(() => false);
  }

  async getProductCardViewportMetrics(id: number | string): Promise<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
  }> {
    const card = this.getByTestId(`product-card-${id}`);
    return await card.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });
  }

  async getProductCardViewportMetricsByIndex(index: number): Promise<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
  }> {
    const card = this.productCards().nth(index);
    return await card.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });
  }

  async isProductCardVisibleByIndex(index: number): Promise<boolean> {
    return await this.productCards()
      .nth(index)
      .isVisible()
      .catch(() => false);
  }

  async scrollProductCardIntoView(id: number | string): Promise<void> {
    await this.getByTestId(`product-card-${id}`).scrollIntoViewIfNeeded();
  }

  async scrollProductCardIntoViewByIndex(index: number): Promise<void> {
    await this.productCards().nth(index).scrollIntoViewIfNeeded();
  }

  async isFirstCategoryLinkVisible(): Promise<boolean> {
    return await this.page
      .locator('.category-list a[href*="category="]')
      .first()
      .isVisible()
      .catch(() => false);
  }

  async isSortSelectVisible(): Promise<boolean> {
    return await this.sortSelect.isVisible().catch(() => false);
  }

  async getNavigationTapTargetMetrics(): Promise<TapTargetMetric[]> {
    return await this.page.evaluate(() => {
      const nav = document.querySelector('nav, .navbar, [role="navigation"]');
      if (!nav) return [];

      const selector =
        'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea';
      const nodes = Array.from(nav.querySelectorAll(selector));

      const isVisible = (el: Element) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const rect = htmlEl.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const isDisabled = (el: Element) => {
        const htmlEl = el as HTMLElement & { disabled?: boolean };
        return Boolean(htmlEl.disabled) || el.getAttribute('aria-disabled') === 'true';
      };

      const compactText = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

      const toLabel = (el: Element, index: number) => {
        const htmlEl = el as HTMLElement;
        return (
          compactText(el.getAttribute('aria-label')) ||
          compactText(el.getAttribute('title')) ||
          compactText((htmlEl as HTMLInputElement).placeholder) ||
          compactText(htmlEl.innerText) ||
          compactText(htmlEl.textContent) ||
          `${el.tagName.toLowerCase()}-${index + 1}`
        );
      };

      return nodes
        .filter((el) => {
          if (!isVisible(el) || isDisabled(el)) return false;
          const parentInteractive = el.parentElement?.closest(selector);
          return !parentInteractive;
        })
        .map((el, index) => {
          const rect = (el as HTMLElement).getBoundingClientRect();
          return {
            label: toLabel(el, index),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom
          };
        });
    });
  }

  async getUndersizedNavigationTapTargets(minSizePx: number): Promise<TapTargetMetric[]> {
    const targets = await this.getNavigationTapTargetMetrics();
    return targets.filter((target) => target.width < minSizePx || target.height < minSizePx);
  }

  // WCAG target-size exception: undersized targets may pass when spacing allows a 24x24 hit area.
  async getTapTargetSizeViolations(minSizePx: number): Promise<TapTargetMetric[]> {
    const targets = await this.getNavigationTapTargetMetrics();
    const violations: TapTargetMetric[] = [];

    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      if (target.width >= minSizePx && target.height >= minSizePx) continue;

      const expandX = Math.max(0, (minSizePx - target.width) / 2);
      const expandY = Math.max(0, (minSizePx - target.height) / 2);
      const expanded = {
        left: target.left - expandX,
        right: target.right + expandX,
        top: target.top - expandY,
        bottom: target.bottom + expandY
      };

      const collidesWithOtherTarget = targets.some((other, index) => {
        if (index === i) return false;
        const overlapWidth = Math.min(expanded.right, other.right) - Math.max(expanded.left, other.left);
        const overlapHeight = Math.min(expanded.bottom, other.bottom) - Math.max(expanded.top, other.top);
        return overlapWidth > 0 && overlapHeight > 0;
      });

      if (collidesWithOtherTarget) {
        violations.push(target);
      }
    }

    return violations;
  }

  async getOverlappingNavigationTapTargetPairs(): Promise<TapTargetPair[]> {
    const targets = await this.getNavigationTapTargetMetrics();
    const pairs: TapTargetPair[] = [];

    for (let i = 0; i < targets.length; i += 1) {
      for (let j = i + 1; j < targets.length; j += 1) {
        const first = targets[i];
        const second = targets[j];

        const overlapWidth = Math.min(first.right, second.right) - Math.max(first.left, second.left);
        const overlapHeight = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);

        if (overlapWidth > 1 && overlapHeight > 1) {
          pairs.push({ first: first.label, second: second.label, distance: 0 });
        }
      }
    }

    return pairs;
  }

  async getCrowdedNavigationTapTargetPairs(
    minSpacingPx: number,
    maxTargetSizePx = 120
  ): Promise<TapTargetPair[]> {
    const targets = (await this.getNavigationTapTargetMetrics()).filter(
      (target) => target.width <= maxTargetSizePx && target.height <= maxTargetSizePx
    );
    const pairs: TapTargetPair[] = [];

    for (let i = 0; i < targets.length; i += 1) {
      for (let j = i + 1; j < targets.length; j += 1) {
        const first = targets[i];
        const second = targets[j];

        const dx = Math.max(0, Math.max(first.left - second.right, second.left - first.right));
        const dy = Math.max(0, Math.max(first.top - second.bottom, second.top - first.bottom));
        const distance = Math.hypot(dx, dy);

        if (distance < minSpacingPx) {
          pairs.push({
            first: first.label,
            second: second.label,
            distance: Number(distance.toFixed(2))
          });
        }
      }
    }

    return pairs;
  }

  async setDocumentTextScale(percent: number): Promise<void> {
    await this.page.evaluate((value) => {
      const styleId = '__pw-mobile-a11y-text-scale';
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `html { font-size: ${value}% !important; }`;
    }, percent);
  }

  async clearDocumentTextScale(): Promise<void> {
    await this.page.evaluate(() => {
      const style = document.getElementById('__pw-mobile-a11y-text-scale');
      style?.remove();
    });
  }

  async getHorizontalOverflowPx(): Promise<number> {
    return await this.page.evaluate(() => {
      const rootOverflow = document.documentElement.scrollWidth - window.innerWidth;
      const bodyOverflow = document.body.scrollWidth - window.innerWidth;
      return Math.max(0, Math.ceil(Math.max(rootOverflow, bodyOverflow)));
    });
  }

  async getOffscreenControlLabels(selectors: readonly string[]): Promise<string[]> {
    return await this.page.evaluate((selectorList) => {
      const selector = selectorList.join(', ');
      const nodes = Array.from(document.querySelectorAll(selector));

      const compactText = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

      return nodes
        .filter((node) => {
          const el = node as HTMLElement;
          const style = window.getComputedStyle(el);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            el.getBoundingClientRect().width === 0 ||
            el.getBoundingClientRect().height === 0
          ) {
            return false;
          }

          const rect = el.getBoundingClientRect();
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        })
        .map((node, index) => {
          const el = node as HTMLElement;
          return (
            compactText(el.getAttribute('aria-label')) ||
            compactText(el.getAttribute('title')) ||
            compactText((el as HTMLInputElement).placeholder) ||
            compactText(el.innerText) ||
            compactText(el.textContent) ||
            `${el.tagName.toLowerCase()}-${index + 1}`
          );
        });
    }, selectors);
  }

  async hasHiddenQaMenu(): Promise<boolean> {
    return (await this.qaToolsTrigger.count()) > 0 && (await this.qaToolsMenuPanel.count()) > 0;
  }

  async openHiddenQaMenu(): Promise<void> {
    await this.qaToolsTrigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await this.qaToolsTrigger.click({ force: true });
    await expect
      .poll(
        async () =>
          await this.qaToolsMenuPanel
            .evaluate((el) => window.getComputedStyle(el).display !== 'none')
            .catch(() => false),
        { timeout: 5_000 }
      )
      .toBe(true);
  }

  async closeHiddenQaMenu(): Promise<void> {
    const panelOpen = await this.qaToolsMenuPanel
      .evaluate((el) => window.getComputedStyle(el).display !== 'none')
      .catch(() => false);
    if (panelOpen) {
      await this.qaToolsTrigger.scrollIntoViewIfNeeded().catch(() => undefined);
      await this.qaToolsTrigger.click({ force: true });
      await expect
        .poll(
          async () =>
            await this.qaToolsMenuPanel
              .evaluate((el) => window.getComputedStyle(el).display === 'none')
              .catch(() => true),
          { timeout: 5_000 }
        )
        .toBe(true);
    }
  }

  async getHiddenQaMenuState(): Promise<HiddenMenuState> {
    const triggerVisible = await this.qaToolsTrigger.isVisible().catch(() => false);
    const triggerLabel = triggerVisible
      ? await this.qaToolsTrigger
          .evaluate((el) => {
            const compactText = (value: string | null | undefined) =>
              (value ?? '').replace(/\s+/g, ' ').trim();

            const ariaLabel = compactText(el.getAttribute('aria-label'));
            if (ariaLabel) return ariaLabel;

            const labelledBy = compactText(el.getAttribute('aria-labelledby'));
            if (labelledBy) {
              const labelText = labelledBy
                .split(/\s+/)
                .map((id) => compactText(document.getElementById(id)?.textContent))
                .filter((value) => value.length > 0)
                .join(' ')
                .trim();
              if (labelText) return labelText;
            }

            const title = compactText(el.getAttribute('title'));
            if (title) return title;

            return '';
          })
          .catch(() => '')
      : '';
    const triggerText = triggerVisible
      ? ((await this.qaToolsTrigger.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim()
      : '';
    const triggerTag = triggerVisible
      ? await this.qaToolsTrigger.evaluate((el) => el.tagName.toLowerCase()).catch(() => null)
      : null;
    const triggerRole = triggerVisible ? await this.qaToolsTrigger.getAttribute('role').catch(() => null) : null;
    const triggerInteractive =
      triggerTag === 'button' ||
      triggerTag === 'a' ||
      triggerTag === 'input' ||
      triggerTag === 'select' ||
      triggerTag === 'textarea' ||
      triggerTag === 'summary' ||
      triggerRole === 'button' ||
      triggerRole === 'menuitem';
    const triggerExpanded = triggerVisible
      ? await this.qaToolsTrigger.getAttribute('aria-expanded')
      : null;

    const panelVisible = await this.qaToolsMenuPanel.isVisible().catch(() => false);
    const panelDisplay = await this.qaToolsMenuPanel
      .evaluate((el) => window.getComputedStyle(el).display)
      .catch(() => null);
    const panelAriaHidden = await this.qaToolsMenuPanel.getAttribute('aria-hidden').catch(() => null);

    return {
      triggerVisible,
      triggerName: triggerLabel || triggerText,
      triggerTag,
      triggerRole,
      triggerInteractive,
      triggerExpanded,
      panelVisible,
      panelDisplay,
      panelAriaHidden
    };
  }

  async getHiddenQaMenuLinkNames(): Promise<string[]> {
    return await this.qaToolsMenuPanel
      .locator('a')
      .evaluateAll((links) =>
        links
          .map((link) => (link.textContent ?? '').replace(/\s+/g, ' ').trim())
          .filter((text) => text.length > 0)
      )
      .catch(() => []);
  }

  getHiddenQaMenuIncludeSelectors(): string[] {
    return ['#devDropdown', '#devDropdown a'];
  }
}
