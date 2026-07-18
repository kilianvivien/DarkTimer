import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('index.html', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const indexHtml = readFileSync(path.resolve(currentDir, '../index.html'), 'utf8');

  it('covers the safe areas without blocking pinch-to-zoom', () => {
    expect(indexHtml).toContain(
      'content="width=device-width, initial-scale=1, viewport-fit=cover"',
    );
    expect(indexHtml).not.toContain('user-scalable=no');
    expect(indexHtml).not.toContain('maximum-scale');
  });

  it('declares standalone-capable metas for installed PWAs', () => {
    expect(indexHtml).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    expect(indexHtml).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(indexHtml).toContain('<meta name="apple-mobile-web-app-title" content="DarkTimer" />');
  });

  it('ships iOS launch images', () => {
    expect(indexHtml).toContain('rel="apple-touch-startup-image"');
  });
});
