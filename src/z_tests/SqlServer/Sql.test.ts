import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Sql';

describe('Sql Creator tests', () => {
  it('Sql Creator', () => {
    const rs = creator({
      name: 'aks',
      group: { resourceGroupName: 'RG' },
      network: {
        privateLink: { subnetIds: ['/123456'] },
        subnetId: '/123456',
      },
      elasticPool: { name: 'Basic', capacity: 100 },

      vulnerabilityAssessment: {
        alertEmails: ['hbd@abc.com'],
        // logStorage replaces the old flat storageAccessKey/storageEndpoint/
        // logStorageId fields; only primaryKey and endpoints.blob are read.
        logStorage: {
          primaryKey: '123',
          endpoints: { blob: 'https://1234' },
        } as any,
      },
      // envRoles is now an IEnvRoleBuilder instance (Builder/EnvRoleBuilder.ts),
      // not a plain role-name lookup like the old getEnvRoleNames() — there's no
      // lightweight stand-in for a unit test, so it's omitted (it's optional).
      // enableAdAdministrator was removed from SqlAuthType; azureAdOnlyAuthentication
      // is the closest replacement but only takes effect when envRoles is set.
      auth: {
        adminLogin: '123',
        password: '123',
      },
      databases: { hello: { name: 'hello' } },
    });

    assert.strictEqual(rs.name, 'teststack-aks-sg-sql');

    assert.notStrictEqual(rs.elasticPool, undefined);
    assert.notStrictEqual(rs.databases, undefined);

    assert.strictEqual(rs.databases!.hello.name, 'teststack-hello-sg-db');
  });
});
