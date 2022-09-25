import creator from '../../ContainerRegistry';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('ContainerRegistry Creator tests', () => {
  it('ContainerRegistry Creator', async () => {
    const rs = await creator({
      name: 'drunkcoding',
    });

    const [n, g] = await outputPromise([
      (rs.registry as any).registryName,
      (rs.registry as any).resourceGroupName,
    ]);
    expect(n).to.equal('drunkcoding4acr');
    expect(g).to.equal('global-grp-hbd');
  });
});
