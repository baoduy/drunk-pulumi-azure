import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Logs';

// Resolves a pulumi Output's value as a real awaited Promise. Using
// `.apply()` directly and asserting inside its callback does NOT fail the
// test on a wrong value: the callback runs on a microtask queued after the
// (non-awaited) async test function has already resolved, so mocha reports
// the test as passing regardless of what the assertion inside apply() finds.
const resolveOutput = <T>(output: { apply: (f: (v: T) => void) => unknown }) =>
  new Promise<T>((resolve) => output.apply(resolve));

describe('Logs Creator tests (DRK-1042 shared-key toggle)', () => {
  const group = { resourceGroupName: 'RG' };

  it('still builds logWp, appInsight and logStorage (existing behaviour)', async () => {
    const rs = creator({
      name: 'audit',
      group,
      deleteAfterDays: 30,
    });

    assert.ok(rs.logWp, 'logWp should be returned');
    assert.ok(rs.appInsight, 'appInsight should be returned');
    assert.ok(rs.logStorage, 'logStorage should be returned');
  });

  it('defaults allowSharedKeyAccess to true when caller passes no storage override', async () => {
    const rs = creator({
      name: 'audit',
      group,
      deleteAfterDays: 30,
    });

    const allowSharedKeyAccess = await resolveOutput(
      rs.logStorage.instance.allowSharedKeyAccess,
    );
    assert.strictEqual(allowSharedKeyAccess, true);
  });

  it('forces Entra-only data-plane auth when storage.allowSharedKeyAccess is explicitly false', async () => {
    const rs = creator({
      name: 'audit',
      group,
      deleteAfterDays: 30,
      storage: { allowSharedKeyAccess: false },
    });

    const allowSharedKeyAccess = await resolveOutput(
      rs.logStorage.instance.allowSharedKeyAccess,
    );
    const defaultToOAuthAuthentication = await resolveOutput(
      (rs.logStorage.instance as any).defaultToOAuthAuthentication,
    );

    // Explicit `false` must survive the `??` hop at the Logs call site and
    // the `||` hop in Storage's own derivation (src/Storage/index.ts:110-111)
    // without being swallowed back to the default.
    assert.strictEqual(allowSharedKeyAccess, false);
    assert.strictEqual(defaultToOAuthAuthentication, true);
  });

  it('keeps shared-key access on when storage.allowSharedKeyAccess is explicitly true', async () => {
    const rs = creator({
      name: 'audit',
      group,
      deleteAfterDays: 30,
      storage: { allowSharedKeyAccess: true },
    });

    const allowSharedKeyAccess = await resolveOutput(
      rs.logStorage.instance.allowSharedKeyAccess,
    );
    const defaultToOAuthAuthentication = await resolveOutput(
      (rs.logStorage.instance as any).defaultToOAuthAuthentication,
    );

    assert.strictEqual(allowSharedKeyAccess, true);
    assert.strictEqual(defaultToOAuthAuthentication, false);
  });
});
