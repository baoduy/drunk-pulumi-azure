import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Architecture tests produced by the monthly architecture review (DRK-1037).
 *
 * These scan production source text rather than constructing Pulumi resources, so
 * they deliberately do not import '../_tools/Mocks' — nothing here touches the
 * Pulumi runtime.
 */

const srcRoot = path.resolve(__dirname, '../..');

/** Every production .ts file under src/, excluding the test tree itself. */
const productionFiles = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'z_tests') continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        out.push(full);
      }
    }
  };
  walk(srcRoot);
  return out.sort();
};

const relative = (file: string) =>
  `src/${path.relative(srcRoot, file).split(path.sep).join('/')}`;

describe('Architecture — Pulumi conventions', () => {
  /**
   * PULUMI-UP-003 — Tier 1 (clean today, this test keeps it that way).
   *
   * A dated module such as `@pulumi/azure-native/storage/v20200101` freezes the
   * resource at that API version, so every later provider hardening default is
   * silently missed and the module eventually leaves its support window. Import
   * the default latest-stable surface instead.
   */
  it('imports no dated @pulumi/azure-native API-version modules', () => {
    const datedImport = /@pulumi\/azure-native\/[A-Za-z0-9]+\/v\d{6,}/;

    const offenders = productionFiles()
      .filter((f) => datedImport.test(fs.readFileSync(f, 'utf8')))
      .map(relative);

    assert.deepStrictEqual(
      offenders,
      [],
      'Dated @pulumi/azure-native API-version imports pin a resource to one API ' +
        'version and miss every later provider hardening default. Use the default ' +
        'latest-stable module instead. Offenders: ' +
        offenders.join(', '),
    );
  });

  /**
   * PULUMI-TYPE-003 — Tier 2 (baseline).
   *
   * `importUri` is part of the shared OptsArgs contract (src/types.ts). A file that
   * destructures it out of its props but never passes `import: importUri` to the
   * resource silently drops the option: the caller asks to adopt an existing Azure
   * resource and Pulumi creates a second one instead.
   *
   * KnownViolations is today's offenders and MUST ONLY SHRINK. Fixing a file deletes
   * its entry; adding an entry means a new violation was let through and is wrong.
   */
  it('passes importUri through to the resource wherever it is destructured', () => {
    // `importUri` preceded by `{` or `,` = destructured out of props.
    // Excludes `importUri?: string` declarations, `'importUri'` in Omit lists,
    // and `importUri: <value>` where it is being passed on rather than consumed.
    const destructuresImportUri = /(?:^|[{,])\s*importUri\s*(?:,|\}|=)/m;
    const passesImportUri = /import:\s*importUri/;

    const knownViolations = [
      // DRK-1045 [A1037-8] — LogAnalytics accepts importUri and drops it.
      'src/Logs/LogAnalytics.ts',
    ];

    const offenders = productionFiles()
      .filter((f) => {
        const text = fs.readFileSync(f, 'utf8');
        return destructuresImportUri.test(text) && !passesImportUri.test(text);
      })
      .map(relative);

    const unexpected = offenders.filter((f) => !knownViolations.includes(f));
    assert.deepStrictEqual(
      unexpected,
      [],
      'These files destructure `importUri` but never pass `import: importUri` to ' +
        'the resource, so a caller adopting an existing Azure resource silently gets ' +
        'a new one created instead. New offenders: ' + unexpected.join(', '),
    );

    const fixed = knownViolations.filter((f) => !offenders.includes(f));
    assert.deepStrictEqual(
      fixed,
      [],
      'These files are on the KnownViolations allow-list but no longer violate the ' +
        'rule. Delete them from the list so it keeps shrinking: ' + fixed.join(', '),
    );
  });
});
