import creator from '../../ContainerRegistry';
import '../_tools/Mocks';
import { expect } from 'chai';


describe('ContainerRegistry Creator tests', () => {
  it('ContainerRegistry Creator', async () => {
    const rs = await creator({
      name: 'drunkcoding',
    });

    (rs.registry as any).registryName.apply(n => {
      expect(n).to.equal('drunkcoding4acr');
      console.log(n);
    });

    (rs.registry as any).resourceGroupName.apply(g => expect(g).to.equal('global-grp-hbd'));
  });
});
