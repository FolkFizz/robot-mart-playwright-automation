// รวมค่าคงที่ไว้ที่เดียว

export const TIMEOUTS = {
    action: 10_000,
    navigation: 30_000,
    expect: 5_000
};

export const SHIPPING = {
    freeThreshold: 1000,
    fee: 50
};

export const COUPONS = {
    valid: ['ROBOT99', 'WELCOME10'],
    expired: 'EXPIRED50'
};

export const TEST_TAGS = {
    functional: '@functional',
    nonFunctional: '@nonfunctional',
    e2e: '@e2e',
    api: '@api',
    integration: '@integration',
    a11y: '@a11y',
    smoke: '@smoke',
    sanity: '@sanity',
    regression: '@regression'
};