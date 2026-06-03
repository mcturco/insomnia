// Stub for jshint — replaces the Node.js-only package in the web build.
// JSHINT is used by CodeMirror's JS linter; returning true (no errors) silently
// disables JS syntax linting in the code editor, which is fine for a prototype.
export function JSHINT(_code: string, _options?: object, _predef?: object): boolean {
  return true;
}
JSHINT.errors = [] as any[];
