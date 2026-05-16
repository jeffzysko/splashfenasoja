import { defineConfig } from '@lovable.dev/vite-tanstack-config';
import type { OutputBundle } from 'rollup';

// Vite plugin: remove CSS Cascade Layers (@layer) wrappers from compiled output.
// Needed for Chrome < 99 (e.g. Chrome 88) which does not support @layer.
// TailwindCSS v4 wraps ALL utilities in @layer utilities { ... }, which Chrome 88
// silently ignores — resulting in zero styles applied.
// This plugin strips the @layer wrappers while preserving the inner CSS rules.
function stripCascadeLayers() {
  return {
    name: 'strip-cascade-layers',
    enforce: 'post' as const,
    transform(code: string, id: string) {
      if (!id.includes('.css') && !id.endsWith('.css')) return;
      return { code: stripLayers(code), map: null };
    },
    generateBundle(_opts: unknown, bundle: OutputBundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && typeof file.source === 'string' && file.source.includes('@layer')) {
          file.source = stripLayers(file.source);
        }
      }
    },
  };
}

function stripLayers(css: string): string {
  // Remove @layer declarations (e.g. @layer utilities, base, components;)
  css = css.replace(/@layer\s+[\w,\s-]+;/g, '');
  // Unwrap @layer X { ... } blocks — keep the inner content, drop the wrapper
  const result: string[] = [];
  let i = 0;
  while (i < css.length) {
    if (css.slice(i, i + 6) === '@layer') {
      const bracePos = css.indexOf('{', i);
      if (bracePos === -1) { result.push(css[i++]); continue; }
      let depth = 1;
      let j = bracePos + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      // Push only the inner content (between the outer braces)
      result.push(css.slice(bracePos + 1, j - 1));
      i = j;
    } else {
      result.push(css[i++]);
    }
  }
  return result.join('');
}

export default defineConfig({
  plugins: [stripCascadeLayers()],
});

