import creator from '../../Sql';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';
import { defaultAlertEmails } from '../../Common/GlobalEnv';

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
        alertEmails: defaultAlertEmails,
        storageAccessKey: '123',
        storageEndpoint: 'https://1234',
        logStorageId: '123456',
      },

      databases: [{ name: 'hello' }],
    });

    const n = await outputPromise((rs.resource as any).serverName);
    expect(n).to.equal('test-stack-aks-sql');

    expect(rs.elasticPool).to.not.undefined;
    expect(rs.databases).to.not.undefined;

    await Promise.all(
      rs.databases!.map(async (db) => {
        const n = await outputPromise((db.resource as any).databaseName);
        expect(n).to.equal('test-stack-hello-db');
      })
    );
  });
});
