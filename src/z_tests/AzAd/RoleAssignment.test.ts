import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { getRoleDefinitionByName } from '../../AzAd/Roles/RoleAssignment';

describe('RoleAssignment tests', function () {
  this.timeout(5000);

  it('getRoleDefinitionByName Creator', () => {
    const rs = getRoleDefinitionByName({
      roleName: 'Contributor',
    });

    assert.notStrictEqual((rs as any).id, undefined);
  });

  it('AzAd/RoleAssignment Creator', () => {
    assert.throws(
      () => getRoleDefinitionByName({ roleName: 'Contributor 1' }),
      { message: 'The role Contributor 1 is not found.' },
    );
  });
});
