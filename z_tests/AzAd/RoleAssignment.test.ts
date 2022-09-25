import { getRoleDefinitionByName } from '../../AzAd/RoleAssignment';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('RoleAssignment tests', function () {
  this.timeout(5000);

  it('getRoleDefinitionByName Creator', async () => {
    const rs = await getRoleDefinitionByName({
      roleName: 'Contributor',
    });

    expect((rs as any).id).to.not.undefined;
  });

  it('getRoleDefinitionByName Creator', async () => {
    try {
      await getRoleDefinitionByName({
        roleName: 'Contributor 1',
      });
    } catch (e) {
      expect((e as Error).message).to.equal('Role Contributor 1 not found');
    }
  });
});
