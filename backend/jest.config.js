module.exports = {
    testEnvironment: 'node',
    verbose: true,
    testMatch: ['**/__tests__/**/*.test.js'],
    // Suites that need real queries require('./setup') themselves rather than
    // it being loaded globally, so the mock-only suites do not pay for booting
    // an in-memory mongod.
    clearMocks: true,
    // Suites backed by a real in-memory mongod need more than the 5s default.
    testTimeout: 30000,
    forceExit: true,
    detectOpenHandles: true,
};
