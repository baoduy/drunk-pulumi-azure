import { getRoleDefinitionByName } from '../../AzAd/RoleAssignment';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('RoleAssignment tests', function () {
  this.timeout(5000);

  it('getRoleDefinitionByName Creator', () => {
    const rs = getRoleDefinitionByName({
      roleName: 'Contributor',
    });

    expect((rs as any).id).to.not.undefined;
  });

  it('AzAd/RoleAssignment Creator', () => {
    try {
      getRoleDefinitionByName({
        roleName: 'Contributor 1',
      });
    } catch (e) {
      expect((e as Error).message).to.equal(
        'The role Contributor 1 is not found.'
      );
    }
  });
});
