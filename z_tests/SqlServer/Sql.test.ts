import creator from '../../Sql';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('Sql Creator tests', () => {
  it('Sql Creator', async () => {
    const rs = await creator({
      name: 'aks',
      group: { resourceGroupName: 'RG' },
      network: {
        privateLink: {},
        subnetId: '/123456',
      },
      elasticPool: { name: 'Basic', capacity: 100 },

      vulnerabilityAssessment: {
        alertEmails: ['hbd@abc.com'],
        storageAccessKey: '123',
        storageEndpoint: 'https://1234',
        logStorageId: '123456',
      },

      databases: [{ name: 'hello' }],
    });

    (rs.resource as any).serverName.apply(n => expect(n).to.equal('test-stack-aks-sql'));

    expect(rs.elasticPool).to.not.undefined;
    expect(rs.databases).to.not.undefined;

    await Promise.all(
      rs.databases!.map(async (db) => {
        (db.resource as any).databaseName.apply(n => expect(n).to.equal('test-stack-hello-db'));
      })
    );
  });
});
