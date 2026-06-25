import { describe, expect, it, vi } from 'vitest';

import type { PluginTheme } from '~/common/plugins/bridge-types';

import defaultTheme from '../../plugins/themes/default';
import { palette } from '../../plugins/themes/palette';
import { containsTemplateSyntax, generateThemeCSS, getPrimitiveCSS, validateTheme, validateThemeName } from './misc';

describe('containsTemplateSyntax', () => {
  it('will return true if the value contains nunjucks without', () => {
    expect(containsTemplateSyntax('{{asdf}}')).toBeTruthy();
  });

  it('will return true if the value contains nunjucks with spaces', () => {
    expect(containsTemplateSyntax('{{ asdf }}')).toBeTruthy();
  });

  it('will return false if the value contains nunjucks', () => {
    expect(containsTemplateSyntax('#rgb(1,2,3)')).toBeFalsy();
  });
});

describe('validateTheme', () => {
  const nunjucksValue = '{{ nunjucks.4.lyfe }}';
  const name = 'mock-plugin';
  const displayName = 'Mock Plugin';
  const mockMessage = (path: string[]) =>
    `[plugin] Nunjucks values in plugin themes are no longer valid. The plugin ${displayName} (${name}) has an invalid value, "${nunjucksValue}" at the path $.theme.${path.join('.')}`;

  vi.spyOn(console, 'error').mockImplementation(() => {});

  it('will validate rawCSS in the plugin theme', () => {
    const pluginTheme: PluginTheme = {
      name,
      displayName,
      theme: {
        rawCss: nunjucksValue,
      },
    };

    validateTheme(pluginTheme);

    const message = mockMessage(['rawCss']);
    expect(console.error).toHaveBeenLastCalledWith(message);
  });

  it('will validate top-level theme blocks in the plugin theme', () => {
    const pluginTheme: PluginTheme = {
      name,
      displayName,
      theme: {
        background: {
          // @ts-ignore
          default: nunjucksValue,
          info: '#abcdef',
        },
      },
    };

    validateTheme(pluginTheme);

    const message = mockMessage(['background', 'default']);
    expect(console.error).toHaveBeenLastCalledWith(message);
  });

  it('will validate styles sub-theme blocks in the plugin theme', () => {
    const pluginTheme: PluginTheme = {
      name,
      displayName,
      theme: {
        styles: {
          appHeader: {
            foreground: {
              // @ts-ignore
              default: nunjucksValue,
              info: '#abcdef',
            },
          },
        },
      },
    };

    validateTheme(pluginTheme);

    const message = mockMessage(['styles', 'appHeader', 'foreground', 'default']);
    expect(console.error).toHaveBeenLastCalledWith(message);
  });
});

describe('getPrimitiveCSS', () => {
  it('emits a --primitive-* var and an -rgb companion for every palette entry', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const css = getPrimitiveCSS();

    // ramp entry + its rgb companion
    expect(css).toContain('--primitive-gray-90:');
    expect(css).toContain('--primitive-gray-90-rgb:');
    // camelCase family is kebab-cased
    expect(css).toContain('--primitive-insomnia-purple-50:');
    expect(css).toContain('--primitive-electric-lime-60:');
    // top-level (non-ramp) entries
    expect(css).toContain('--primitive-black:');
    expect(css).toContain('--primitive-white:');

    // no palette value failed to parse
    expect(logSpy).not.toHaveBeenCalledWith('[theme] Failed to parse primitive color', expect.anything(), expect.anything());
    logSpy.mockRestore();
  });
});

describe('default theme (primitive-sourced)', () => {
  it('assigns semantic roles from palette primitives', () => {
    expect(defaultTheme.theme.background.default).toEqual(palette.gray['90']);
    expect(defaultTheme.theme.background.cta).toEqual(palette.insomniaPurple['50']);
  });

  it('defines app-controlled method + status tokens in rawCss', () => {
    const { rawCss } = defaultTheme.theme;
    expect(rawCss).toContain('--method-color-bg-get:');
    expect(rawCss).toContain('--method-color-text-get:');
    expect(rawCss).toContain('--status-color-bg-3xx:');
  });

  it('only uses keys that exist in the plugin theme contract', () => {
    const allowed = ['background', 'foreground', 'highlight', 'styles', 'rawCss'];
    expect(Object.keys(defaultTheme.theme).every(key => allowed.includes(key))).toBe(true);
  });

  it('generateThemeCSS emits the semantic CSS vars (concrete colors, not var refs)', () => {
    const css = generateThemeCSS(defaultTheme as unknown as PluginTheme);
    expect(css).toContain('--color-bg:');
    expect(css).toContain('--color-surprise:');
    // semantic layer is resolved hex -> rgb(), never a var() reference
    expect(css).not.toContain('--color-bg: var(');
  });
});

describe('validateThemeName', () => {
  it('will return valid names as-is', () => {
    const name = 'default-dark';
    const validName = validateThemeName(name);
    expect(name).toEqual(validName);
  });

  it('will lowercase', () => {
    const name = 'Default-dark';
    const validName = validateThemeName(name);
    expect(name).not.toEqual(validName);
    expect(validName).toEqual('default-dark');
  });

  it('will replace spaces', () => {
    const name = 'default dark';
    const validName = validateThemeName(name);
    expect(name).not.toEqual(validName);
    expect(validName).toEqual('default-dark');
  });
});
