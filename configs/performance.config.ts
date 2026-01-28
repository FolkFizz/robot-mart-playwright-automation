export const PERFORMANCE_CONFIG = {
  thresholds: {
    loadTime: 3000,
    firstContentfulPaint: 1500,
    timeToInteractive: 3500,
    largestContentfulPaint: 2500,
  },
  metrics: ['FCP', 'LCP', 'TTI', 'TBT', 'CLS'],
};
