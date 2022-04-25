export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.(spec|test).ts'],
  testPathIgnorePatterns: ['rust'],
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
      diagnostics: false,
    },
  },
};
