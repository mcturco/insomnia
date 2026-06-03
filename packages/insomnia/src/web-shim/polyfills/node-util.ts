// Browser-compatible polyfill for Node.js `util` / `node:util`.
// Provides the subset of the API that bundled npm packages (mocha, jshint,
// tough-cookie, etc.) commonly call at module-init time.

export function promisify(fn: Function): (...args: any[]) => Promise<any> {
  return (...args: any[]) =>
    new Promise((resolve, reject) => {
      fn(...args, (err: Error | null, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
}

export function callbackify(fn: Function) {
  return (...args: any[]) => {
    const cb = args.pop();
    (fn(...args) as Promise<any>).then(
      (v: any) => cb(null, v),
      (e: any) => cb(e),
    );
  };
}

export function format(fmt: any, ...args: any[]): string {
  if (typeof fmt !== 'string') return [fmt, ...args].map(String).join(' ');
  let i = 0;
  return fmt.replace(/%[sdifjoO%]/g, m => {
    if (m === '%%') return '%';
    const val = args[i++];
    if (m === '%o' || m === '%O') return JSON.stringify(val);
    return String(val ?? m);
  });
}

export function inspect(obj: any, _opts?: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export function inherits(ctor: any, superCtor: any) {
  ctor.super_ = superCtor;
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

export function deprecate(fn: Function, _msg?: string): Function {
  return fn;
}

export function debuglog(_section: string) {
  return (..._args: any[]) => {};
}

export const types = {
  isRegExp: (v: any): v is RegExp => v instanceof RegExp,
  isDate: (v: any): v is Date => v instanceof Date,
  isNativeError: (v: any): v is Error => v instanceof Error,
  isPromise: (v: any): v is Promise<any> => v instanceof Promise,
};

export class TextDecoder extends globalThis.TextDecoder {}
export class TextEncoder extends globalThis.TextEncoder {}

const nodeUtil = {
  promisify,
  callbackify,
  format,
  inspect,
  inherits,
  deprecate,
  debuglog,
  types,
  TextDecoder,
  TextEncoder,
};

export default nodeUtil;
