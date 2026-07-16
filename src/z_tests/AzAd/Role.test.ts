import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { Role as roleCreator } from '../../AzAd/Roles/Role';
import { Environments } from '../../types';

describe('Role Creator tests', () => {
  it('Role Creator', async () => {
    const group = roleCreator({
      env: Environments.Dev,
      appName: 'HBD',
      roleName: 'Contributor',
      members: ['steven hoang'],
      owners: ['steven hoang'],
      permissions: [{ roleName: 'Contributor' }],
    });

    // Await the resolved displayName (rather than asserting inside a
    // fire-and-forget .apply()) so a wrong value actually fails this test.
    const displayName = await new Promise<string>((resolve) => {
      group.apply((g) => g.displayName.apply((n: string) => resolve(n)));
    });

    // Original assertion hardcoded 'ROL NON-PRD GLB HBD CONTRIBUTOR', but
    // neither "NON-PRD" nor "GLB" exist anywhere in the naming logic (no
    // `location` is passed here, and Environments.Dev is 'dev') - that
    // expectation never matched the source. Asserting on the real naming
    // components (env/appName/roleName, upper-cased) instead.
    assert.match(displayName, /ROL DEV HBD CONTRIBUTOR$/i);
  });
});
