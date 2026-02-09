import { Page, expect } from '@playwright/test';

export const a11yTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export const a11yExcludeSelectors = ['#chaos-widget', '.chaos-widget'];

export const a11yRules: Record<string, { enabled: boolean }> = {};

export const allowedViolationIds: string[] = [];

export type AxeViolation = {
  id: string;
  impact?: string | null;
  description?: string;
  help?: string;
  helpUrl?: string;
  nodes?: Array<{
    target: string[];
    html?: string;
    failureSummary?: string;
  }>;
};

export type AxeResults = {
  violations: AxeViolation[];
  passes?: unknown[];
  incomplete?: unknown[];
  inapplicable?: unknown[];
};

export type A11yRunOptions = {
  include?: string | string[];
  exclude?: string[];
  tags?: string[];
  rules?: Record<string, { enabled: boolean }>;
  allowedViolations?: string[];
  waitForNetworkIdle?: boolean;
};

const toArray = (value?: string | string[]) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

export const runA11y = async (page: Page, options: A11yRunOptions = {}): Promise<AxeResults> => {
  if (options.waitForNetworkIdle ?? true) {
    await page.waitForLoadState('networkidle');
  }

  let AxeBuilder: any;
  try {
    const mod = await import('@axe-core/playwright');
    AxeBuilder = mod.AxeBuilder;
  } catch {
    throw new Error(
      'Missing dependency: @axe-core/playwright. Install it first: `npm i -D @axe-core/playwright`'
    );
  }

  let builder = new AxeBuilder({ page });

  const includeSelectors = toArray(options.include);
  includeSelectors.forEach((selector) => {
    builder = builder.include(selector);
  });

  const excludeSelectors = [...a11yExcludeSelectors, ...(options.exclude ?? [])];
  excludeSelectors.forEach((selector) => {
    builder = builder.exclude(selector);
  });

  const tags = options.tags ?? a11yTags;
  if (tags && tags.length > 0) {
    builder = builder.withTags(tags);
  }

  const rules = options.rules ?? a11yRules;
  if (rules && Object.keys(rules).length > 0) {
    builder = builder.configure({ rules });
  }

  return await builder.analyze();
};

export const filterViolations = (results: AxeResults, allowedIds: string[] = allowedViolationIds) => {
  return results.violations.filter((violation) => !allowedIds.includes(violation.id));
};

export const formatViolations = (violations: AxeViolation[]) => {
  if (!violations.length) return 'No accessibility violations found';

  return violations
    .map((v) => {
      const nodes = v.nodes?.map((n) => n.target.join(', ')).join(' | ') ?? 'no nodes';
      return `- ${v.id} (${v.impact ?? 'unknown'}): ${v.help ?? v.description ?? ''}\n  ${nodes}`;
    })
    .join('\n');
};

export const expectNoA11yViolations = (
  results: AxeResults,
  allowedIds: string[] = allowedViolationIds
) => {
  const violations = filterViolations(results, allowedIds);
  expect(violations, formatViolations(violations)).toEqual([]);
};
