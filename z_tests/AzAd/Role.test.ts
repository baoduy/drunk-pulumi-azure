import roleCreator from '../../AzAd/Role';
import '../_tools/Mocks';
import { expect } from 'chai';
import { Environments } from '../../Common/AzureEnv';

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

    group.displayName.apply(n => expect(n).to.equal('ROL NON-PRD GLB HBD CONTRIBUTOR'));
  });
});
