module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],

  // Coverage configuration
  // Phase 1-2: Only collecting coverage for lib/ and database/
  // server.js and scripts/ will be added in Phase 3
  collectCoverageFrom: [
    'lib/**/*.js',
    'database/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './lib/': {
      branches: 80,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './database/': {
      branches: 0,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Test timeout (for database operations)
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
