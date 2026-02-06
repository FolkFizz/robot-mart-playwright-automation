export const ramping = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '30s', target: 5 },  // Ramp up to 5 users
        { duration: '1m', target: 5 },   // Stay at 5 users
        { duration: '30s', target: 0 },  // Ramp down
    ],
    gracefulRampDown: '30s',
};
