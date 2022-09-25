import roleCreator from '../../AzAd/Role';
import '../_tools/Mocks';
import { expect } from 'chai';
import { Environments } from '../../Common/AzureEnv';
import { outputPromise } from '../../Common/Helpers';

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

    const n = await outputPromise(group.displayName);
    expect(n).to.equal('ROL NON-PRD GLB HBD CONTRIBUTOR');
  });
});
