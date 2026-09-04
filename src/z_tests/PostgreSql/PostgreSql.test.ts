import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/PostgreSqlBuilder';
import { naming } from '../../Common';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

// `protect` is a Pulumi *resource option*, not an output, and
// MockResourceArgs (src/z_tests/_tools/Mocks.ts) only exposes
// `type` / `name` / `inputs` / `provider` / `custom` / `id` — `protect` is
// never handed to the mock, so it cannot be asserted directly here. The
// Locker half is asserted instead: in PostgreSqlBuilder.buildPostgreSql both
// `protect: this._lock` and the guarded `Locker(...)` call are driven by the
// same `_lock` field, so the lock resource's presence/absence is a reliable
// proxy for `protect`'s value.
const LOCK_TYPE = 'azure-native:authorization:ManagementLockByScope';

const vaultInfo = { id: '/vault/123', group: { resourceGroupName: 'RG' }, name: 'vault' };
const group = { resourceGroupName: 'RG' };
const sku = { sku: { name: 'Standard_B1ms', tier: 'Burstable' }, version: '16' as const };

const buildPostgreSql = () =>
  creator({ name: 'postgres', group, vaultInfo }).withSku(sku).withLogin({
    adminLogin: 'adminUser',
    password: 'P@ssw0rd123',
  });

describe('PostgreSqlBuilder deletion guard (lock)', () => {
  it('non-production default: no .lock() call creates no ManagementLockByScope', async () => {
    const before = createdResources.length;
    buildPostgreSql().build();

    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(
      !createdResources.slice(before).some((r) => r.type === LOCK_TYPE),
      'expected no ManagementLockByScope when lock() is never called',
    );
  });

  it('.lock() guards the instance with a CanNotDelete ManagementLockByScope', async () => {
    const before = createdResources.length;
    const rs = buildPostgreSql().lock().build();

    const lockInputs = await waitForResource(LOCK_TYPE, before);
    assert.strictEqual(lockInputs.level, 'CanNotDelete');
    assert.strictEqual(lockInputs.lockName, `${rs.name}-CanNotDelete`);
  });

  it('.lock(false) explicitly opts out even though it would otherwise lock', async () => {
    const before = createdResources.length;
    buildPostgreSql().lock(false).build();

    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(
      !createdResources.slice(before).some((r) => r.type === LOCK_TYPE),
      'expected no ManagementLockByScope after lock(false)',
    );
  });

  it('lock() returns a chainable builder', () => {
    const rs = buildPostgreSql().lock().withDatabases('appdb').build();
    assert.strictEqual(rs.name, naming.getPostgresqlName('postgres'));
  });
});

// There were no tests for PostgreSqlBuilder before this cycle (DRK-1058), so
// the class-wide 80% coverage gate applies to the whole class, not just the
// new lock() surface — these cover the pre-existing chain methods the lock
// work touched the file around.
describe('PostgreSqlBuilder other chain methods', () => {
  it('generateLogin() derives admin credentials instead of requiring withLogin', () => {
    const rs = creator({ name: 'postgres', group, vaultInfo })
      .withSku(sku)
      .generateLogin()
      .build();

    assert.strictEqual(rs.name, naming.getPostgresqlName('postgres'));
  });

  it('withOptions() overrides storage size and maintenance window on the server', async () => {
    const before = createdResources.length;
    creator({ name: 'postgres', group, vaultInfo })
      .withSku(sku)
      .withLogin({ adminLogin: 'adminUser', password: 'P@ssw0rd123' })
      .withOptions({
        storageSizeGB: 256,
        maintenanceWindow: { customWindow: 'Enabled', dayOfWeek: 1, startHour: 2, startMinute: 30 },
      })
      .build();

    const server = await waitForResource('azure-native:dbforpostgresql:Server', before);
    assert.strictEqual(server.storage.storageSizeGB, 256);
    assert.strictEqual(server.maintenanceWindow.dayOfWeek, 1);
  });

  it('withNetwork ipAddresses creates a whitelist FirewallRule', async () => {
    const before = createdResources.length;
    buildPostgreSql().withNetwork({ ipAddresses: ['1.2.3.4'] }).build();

    const inputs = await waitForResource('azure-native:dbforpostgresql:FirewallRule', before);
    assert.strictEqual(inputs.startIpAddress, '1.2.3.4');
  });

  it('withNetwork allowsPublicAccess creates the allow-public FirewallRule', async () => {
    const before = createdResources.length;
    buildPostgreSql().withNetwork({ allowsPublicAccess: true }).build();

    const inputs = await waitForResource('azure-native:dbforpostgresql:FirewallRule', before);
    assert.strictEqual(inputs.startIpAddress, '0.0.0.0');
    assert.strictEqual(inputs.endIpAddress, '255.255.255.255');
  });

  it('withNetwork privateLink creates a private endpoint', async () => {
    const before = createdResources.length;
    buildPostgreSql().withNetwork({ privateLink: { subnetIds: ['/subnet/1'] } }).build();

    const endpoint = await waitForResource('azure-native:network:PrivateEndpoint', before);
    assert.ok(endpoint);
  });
});
