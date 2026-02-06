export const spike = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '10s', target: 0 },  // Warm up
        { duration: '10s', target: 20 }, // SPIKE! 20 users instantly
        { duration: '1m', target: 20 },  // Hold spike
        { duration: '10s', target: 0 },  // Recovery
    ],
    gracefulRampDown: '30s',
};
