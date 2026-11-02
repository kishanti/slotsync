module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 60000,
  testMatch: ['**/__tests__/**/*.test.js'],
  globalSetup: './__tests__/globalSetup.js',
  globalTeardown: './__tests__/globalTeardown.js',
  setupFilesAfterEnv: ['./__tests__/setup.js']
};
