import vaultCreator from '../../KeyVault';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('Key Vault Creator tests', () => {
  it('Vault Creator', async () => {
    const group = { resourceGroupName: 'RG' };

    const rs = await vaultCreator({
      name: 'root',
      group,
    });

    expect(rs.name).to.equal('test-stack-root-vlt');
    expect(rs.toVaultInfo().group).to.equal(group);

    rs.resource.urn.apply(n => expect(n).to.include('test-stack-root-vlt'));
  }).timeout(5000);

  it('Vault Creator with custom prefix', async () => {
    const group = { resourceGroupName: 'RG' };

    const rs = await vaultCreator({
      name: 'root',
      group,
    });

    expect(rs.name).to.equal('test-stack-root-vlt');
    expect(rs.toVaultInfo().group).to.equal(group);

    rs.resource.urn.apply(n => expect(n).to.include('test-stack-root-vlt'));
  }).timeout(5000);
});
