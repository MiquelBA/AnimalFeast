// The engine must stay pure TypeScript: no React, no DOM, no Node APIs.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ENGINE_DIR = fileURLToPath(new URL('..', import.meta.url));
const DOM_GLOBALS = /\b(window|document|localStorage|navigator|requestAnimationFrame|HTMLElement)\b/;

describe('engine purity', () => {
  const files = readdirSync(ENGINE_DIR).filter((f) => f.endsWith('.ts'));
  it.each(files)('%s only imports engine modules and uses no DOM globals', (file) => {
    const src = readFileSync(join(ENGINE_DIR, file), 'utf8');
    const imports = [...src.matchAll(/from\s+['']([^'']+)['']/g)].map((m) => m[1]);
    for (const spec of imports) expect(spec.startsWith('./')).toBe(true);
    expect(src).not.toMatch(DOM_GLOBALS);
  });
});
