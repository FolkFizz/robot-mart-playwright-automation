import { routes } from '@config';
import { chaosToggles } from '@data';

export const allChaosToggles = [
  chaosToggles.dynamicIds,
  chaosToggles.flakyElements,
  chaosToggles.layoutShift,
  chaosToggles.zombieClicks,
  chaosToggles.textScramble,
  chaosToggles.latency,
  chaosToggles.randomErrors,
  chaosToggles.brokenAssets
] as const;

export const fullChaosConfig = {
  dynamicIds: true,
  flakyElements: true,
  layoutShift: true,
  zombieClicks: true,
  textScramble: true,
  latency: true,
  randomErrors: true,
  brokenAssets: true
} as const;

export const checkoutPaths = [routes.order.checkout, routes.order.place];
