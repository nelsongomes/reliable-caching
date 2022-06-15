// eslint-disable-next-line no-undef
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.ts?(x)"],
  moduleFileExtensions: ["ts", "js", "json"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  setupFilesAfterEnv: ["./test/jest.setup.ts"],
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "test/tsconfig.json",
    },
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx,js,jsx}", "!src/**/*.d.ts"],
};
