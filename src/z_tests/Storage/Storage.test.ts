import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Storage';

// Resolves a pulumi Output's value as a real awaited Promise. Using
// `.apply()` directly and asserting inside its callback does NOT fail the
// test on a wrong value: the callback runs on a microtask queued after the
// (non-awaited) async test function has already resolved, so mocha reports
// the test as passing regardless of what the assertion inside apply() finds.
const resolveOutput = <T>(output: { apply: (f: (v: T) => void) => unknown }) =>
  new Promise<T>((resolve) => output.apply(resolve));

describe('Storage Creator tests', () => {
  it('Storage Creator', async () => {
    // defaultManagementRules moved under `policies` in the current API.
    const rs = creator({
      name: 'storage',
      group: { resourceGroupName: 'RG' },
      policies: {
        defaultManagementRules: [
          {
            actions: {
              baseBlob: {
                delete: {
                  daysAfterModificationGreaterThan: 365,
                  daysAfterLastAccessTimeGreaterThan: 365,
                },
                tierToCool: {
                  daysAfterModificationGreaterThan: 365,
                  daysAfterLastAccessTimeGreaterThan: 365,
                },
                tierToArchive: {
                  daysAfterModificationGreaterThan: 365 * 3,
                  daysAfterLastAccessTimeGreaterThan: 365 / 2,
                },
                enableAutoTierToHotFromCool: true,
              },
              snapshot: { delete: { daysAfterCreationGreaterThan: 365 } },
              version: { delete: { daysAfterCreationGreaterThan: 365 } },
            },
            filters: {
              blobTypes: ['blockBlob', 'appendBlob'],
              containerNames: [
                'insights-logs-auditevent',
                'insights-metrics-pt1m',
                '$logs',
              ],
            },
          },
        ],
      },
    });

    const accountName = await resolveOutput(rs.instance.name);
    assert.strictEqual(accountName, 'teststackstoragetestorga');
  });

  it('Storage Creator with feature flags', async () => {
    // featureFlags was renamed to `features` in the current API.
    const rs = creator({
      name: 'storage',
      features: { allowSharedKeyAccess: true, enableStaticWebsite: true },
      group: { resourceGroupName: 'RG' },
    });

    const allowSharedKeyAccess = await resolveOutput(
      rs.instance.allowSharedKeyAccess,
    );
    assert.strictEqual(allowSharedKeyAccess, true);
  });
});
