import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const CORE = join(__dirname, '../../src/core');

test('src/core never imports Phaser or touches window/document', () => {
  const files = readdirSync(CORE).filter(f => f.endsWith('.ts'));
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const src = readFileSync(join(CORE, f), 'utf8');
    expect(src, f).not.toMatch(/from ['"]phaser['"]|\bwindow\.|\bdocument\./);
  }
});
