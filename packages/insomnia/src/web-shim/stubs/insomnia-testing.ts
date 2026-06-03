// Stub for insomnia-testing — the test runner pulls in mocha which uses Node.js
// built-ins (node:util, node:fs, etc.) that can't run in a browser.
// The test-suite routes import generate/runTests; stubbing here keeps them from
// crashing on load while gracefully preventing test execution at runtime.

export type Test = { name: string; code: string };
export type TestResults = { stats: Record<string, number>; tests: any[] };

export function generate(_suites: any[]): string {
  return '';
}

export async function runTests(_src: string, _options: any): Promise<TestResults> {
  throw new Error('Test runner is not available in the web prototype.');
}
