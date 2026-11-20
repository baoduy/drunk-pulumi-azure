import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Sql';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

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

  it('sizes the elastic pool from maxSizeBytesGb and opens one firewall rule per allowed IP', async () => {
    const before = createdResources.length;
    const rs = creator({
      name: 'sqlfw',
      group: { resourceGroupName: 'RG' },
      network: { ipAddresses: ['10.0.0.1'] },
      elasticPool: { name: 'Standard', capacity: 100, maxSizeBytesGb: 50 },
      auth: { adminLogin: '123', password: '123' },
    });

    const pool = await waitForResource(
      'azure-native:sql:ElasticPool',
      before,
      (i) => i.elasticPoolName === rs.elasticPool!.name,
    );
    assert.strictEqual(pool.maxSizeBytes, 53687091200);

    const rule = await waitForResource(
      'azure-native:sql:FirewallRule',
      before,
      (i) => i.firewallRuleName === 'teststack-sqlfw-sg-fwRule-0',
    );
    assert.strictEqual(rule.startIpAddress, '10.0.0.1');
    assert.strictEqual(rule.endIpAddress, '10.0.0.1');
  });
});
