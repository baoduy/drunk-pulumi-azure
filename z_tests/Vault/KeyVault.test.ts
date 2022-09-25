import vaultCreator from '../../KeyVault';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('Key Vault Creator tests', () => {
  it('Vault Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = await vaultCreator({
      name: 'root',
      group,
    });

    expect(rs.name).to.equal('test-stack-root-vlt');
    expect(rs.toVaultInfo().group).to.equal(group);

    const n = await outputPromise(rs.resource.urn);
    expect(n).to.include('test-stack-root-vlt');
  });

  it('Vault Creator with custom prefix', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = await vaultCreator({
      name: 'root',
      group,
    });

    expect(rs.name).to.equal('test-stack-root-vlt');
    expect(rs.toVaultInfo().group).to.equal(group);

    const n = await outputPromise(rs.resource.urn);
    expect(n).to.include('test-stack-root-vlt');
  });
});
