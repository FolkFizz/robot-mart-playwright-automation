export const mobileA11yProjects = ['iphone', 'pixel'] as const;

export const mobileA11yThresholds = {
  tapTargetMinPx: 24,
  tapTargetEdgeMinPx: 24,
  tapTargetSpacingMinPx: 8,
  tapTargetSpacingEdgeMinPx: 4,
  maxHorizontalOverflowPx: 1,
  reflowTextScalePercent: 200,
  reflowEdgeTextScalePercent: 250
} as const;

export const mobileA11yCoreControlSelectors = [
  '.nav-link-main',
  '#devMenuContainer .dropdown-trigger',
  'input[placeholder="Search models..."]',
  '.sort-select',
  '.btn-filter'
] as const;
