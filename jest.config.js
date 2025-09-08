module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '/dist/',
    '/frontend/',
  ],
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  verbose: true,
  transformIgnorePatterns: [
    '/node_modules/',
  ],
}