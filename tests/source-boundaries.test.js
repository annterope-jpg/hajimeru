import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  findProhibitedUserClaims,
} from '../src/domain/regressionGuards';

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

describe('source boundary regressions', () => {
  it('keeps prohibited claims out of current app source copy', () => {
    const appRoot = join(process.cwd(), 'app');
    const combined = sourceFiles(appRoot).map((path) => readFileSync(path, 'utf8')).join('\n');
    expect(findProhibitedUserClaims(combined)).toEqual([]);
  });

  it('keeps direct console logging out of app, domain, and edge-function source', () => {
    const roots = ['app', 'src/domain', 'supabase/functions'].map((path) => join(process.cwd(), path));
    const offenders = roots
      .flatMap(sourceFiles)
      .filter((path) => /console\.(?:log|info|debug|warn|error)\s*\(/u.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
