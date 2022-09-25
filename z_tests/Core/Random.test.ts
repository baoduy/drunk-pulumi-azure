import '../_tools/Mocks';

import { randomPassword, randomSsh, randomUuId } from '../../Core/Random';

import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('Random Creator tests', () => {
  it('Random Password monthly', async () => {
    const pass = randomPassword({
      name: 'aks',
      policy: 'monthly',
    });

    expect(pass).to.not.undefined;
  });

  it('Random Password yearly', async () => {
    const pass = randomPassword({
      name: 'aks',
    });

    expect(pass).to.not.undefined;
  });

  it('Random Static Password', async () => {
    const pass = randomPassword({
      name: 'aks',
      policy: false,
    });

    expect(pass).to.not.undefined;
  });

  it('Random Uuid', async () => {
    const uid = randomUuId('aks');

    const id = await outputPromise(uid.result);
    expect(id)
      .has.length(36)
      .and.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
  });

  it('Random ssh', async () => {
    const ssh = randomSsh({
      name: 'aks',
      vaultInfo: { name: 'v', group: { resourceGroupName: 'g' }, id: 'id' },
    });
    expect(ssh).to.not.undefined;
  });
});
