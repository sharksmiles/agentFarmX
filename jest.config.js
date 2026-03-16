const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: [],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  // Override moduleNameMapper to ensure our paths come first
  config.moduleNameMapper = {
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    ...config.moduleNameMapper,
  };
  return config;
};
