/**
 * Shared k6 threshold presets.
 * Scripts should import from this file instead of defining private thresholds.
 */

export const smokeThresholds = {
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01']
};

export const browseThresholds = {
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01']
};

export const cartThresholds = {
  http_req_duration: ['p(95)<800'],
  http_req_failed: ['rate<0.01']
};

export const authThresholds = {
  'http_req_duration{endpoint:auth_login}': ['p(95)<1000'],
  'http_req_failed{endpoint:auth_login}': ['rate<0.01'],
  auth_unexpected: ['count==0'],
  profile_success: ['count>0']
};

export const checkoutThresholds = {
  'http_req_duration{endpoint:checkout_mock_pay}': ['p(95)<1000'],
  'http_req_failed{endpoint:checkout_mock_pay}': ['rate==0.00'],
  checkout_attempts: ['count>0'],
  checkout_success: ['count>0'],
  checkout_unexpected: ['count==0']
};

export const checkoutAcceptanceThresholds = {
  checkout_attempts: ['count>0'],
  checkout_success: ['count>0']
};

export const raceThresholds = {
  'http_req_duration{endpoint:checkout_mock_pay}': ['p(95)<5000'],
  'http_req_failed{endpoint:checkout_mock_pay}': ['rate<0.10'],
  successful_purchases: ['count>0'],
  unexpected_purchases: ['count==0']
};

export const loadThresholds = {
  http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  http_req_failed: ['rate<0.10']
};

export const loadBalancedThresholds = {
  ...loadThresholds,
  login_duration: ['p(95)<800'],
  browse_duration: ['p(95)<1000'],
  cart_duration: ['p(95)<500'],
  checkout_duration: ['p(95)<800'],
  checkout_attempts: ['count>0'],
  full_journey_success: ['count>0']
};

export const loadAcceptanceThresholds = {};

export const stressThresholds = {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'],
  http_req_failed: ['rate<0.10']
};

export const soakThresholds = {
  http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  http_req_failed: ['rate<0.02']
};

export const breakpointThresholds = {
  http_req_failed: ['rate<0.50']
};
