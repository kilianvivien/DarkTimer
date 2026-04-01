import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('index.html', () => {
  it('locks the mobile viewport scale for native-app-style input focus', () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const indexHtml = readFileSync(path.resolve(currentDir, '../index.html'), 'utf8');

    expect(indexHtml).toContain(
      'content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"',
    );
  });
});
