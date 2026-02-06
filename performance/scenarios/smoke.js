export const smoke = {
    executor: 'constant-vus',
    vus: 1, // Single User
    duration: '60s', // Increased to handle cold starts
    gracefulStop: '0s',
};
