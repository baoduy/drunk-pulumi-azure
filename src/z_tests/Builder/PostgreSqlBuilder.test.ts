import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/PostgreSqlBuilder';
import * as postgresql from '@pulumi/azure-native/dbforpostgresql';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';
import { createEnvRoleBuilderStub } from '../_tools/EnvRoleBuilderStub';

const SERVER_TYPE = 'azure-native:dbforpostgresql:Server';
const ADMINISTRATOR_TYPE = 'azure-native:dbforpostgresql:Administrator';

const waitForServer = (before: number) => waitForResource(SERVER_TYPE, before);

const group = { resourceGroupName: 'RG' };
const vaultInfo = { id: '/12345', group, name: 'vault' };
const sku = { sku: { name: 'Standard_B1ms', tier: 'Burstable' }, version: postgresql.PostgresMajorVersion.PostgresMajorVersion_16 };

describe('PostgreSqlBuilder Entra authentication', () => {
  it('regression baseline: no envRoles, no authConfig keeps today\'s password-only behaviour', async () => {
    const before = createdResources.length;

    creator({ name: 'pg-baseline', group, vaultInfo })
      .withSku(sku)
      .generateLogin()
      .build();

    const inputs = await waitForServer(before);
    assert.strictEqual(inputs.authConfig.passwordAuth, 'Enabled');
    assert.strictEqual(inputs.authConfig.activeDirectoryAuth, 'Disabled');
    assert.ok(inputs.administratorLogin, 'expected administratorLogin to be set');
    assert.ok(inputs.administratorLoginPassword, 'expected administratorLoginPassword to be set');

    assert.ok(
      !createdResources.slice(before).some((r) => r.type === ADMINISTRATOR_TYPE),
      'expected no Entra administrator resource when envRoles is absent',
    );
  });

  it('envRoles present, no authConfig override: activeDirectoryAuth defaults to Enabled and an Entra administrator is created', async () => {
    const before = createdResources.length;
    const envRoles = createEnvRoleBuilderStub();

    creator({ name: 'pg-envroles', group, vaultInfo, envRoles })
      .withSku(sku)
      .generateLogin()
      .build();

    const inputs = await waitForServer(before);
    // Mechanically-checked assertion the ticket names explicitly.
    assert.notStrictEqual(inputs.authConfig.activeDirectoryAuth, 'Disabled');
    assert.strictEqual(inputs.authConfig.activeDirectoryAuth, 'Enabled');

    const adminInputs = await waitForResource(ADMINISTRATOR_TYPE, before);
    assert.strictEqual(adminInputs.objectId, 'admin-object-id');
    assert.strictEqual(adminInputs.principalName, 'admin-group');
    assert.strictEqual(adminInputs.principalType, postgresql.PrincipalType.Group);
  });

  it('Entra-only: passwordAuth Disabled omits administratorLoginPassword from the server resource', async () => {
    const before = createdResources.length;
    const envRoles = createEnvRoleBuilderStub();

    creator({ name: 'pg-entraonly', group, vaultInfo, envRoles })
      .withSku(sku)
      .generateLogin()
      .withOptions({ authConfig: { passwordAuth: 'Disabled', activeDirectoryAuth: 'Enabled' } })
      .build();

    const inputs = await waitForServer(before);
    assert.strictEqual(inputs.authConfig.passwordAuth, 'Disabled');
    assert.strictEqual('administratorLogin' in inputs, false);
    assert.strictEqual('administratorLoginPassword' in inputs, false);
  });

  it('caller forces Entra off even with envRoles: no Entra administrator is created', async () => {
    const before = createdResources.length;
    const envRoles = createEnvRoleBuilderStub();

    creator({ name: 'pg-forceoff', group, vaultInfo, envRoles })
      .withSku(sku)
      .generateLogin()
      .withOptions({ authConfig: { activeDirectoryAuth: 'Disabled' } })
      .build();

    const inputs = await waitForServer(before);
    assert.strictEqual(inputs.authConfig.activeDirectoryAuth, 'Disabled');

    assert.ok(
      !createdResources.slice(before).some((r) => r.type === ADMINISTRATOR_TYPE),
      'expected no Entra administrator resource when activeDirectoryAuth resolves Disabled',
    );
  });

  it('throws when vaultInfo is missing (the identity/UID plumbing that also carries auth requires it)', () => {
    assert.throws(() =>
      creator({ name: 'pg-novault', group })
        .withSku(sku)
        .withLogin({ adminLogin: 'admin', password: 'pass' })
        .build(),
    );
  });

  it('network and database options build firewall rules and databases alongside auth', async () => {
    const before = createdResources.length;

    creator({ name: 'pg-network', group, vaultInfo })
      .withSku(sku)
      .generateLogin()
      .withNetwork({ ipAddresses: ['1.2.3.4'], allowsPublicAccess: true })
      .withDatabases('appdb')
      .build();

    await waitForServer(before);
    const firewallRule = await waitForResource(
      'azure-native:dbforpostgresql:FirewallRule',
      before,
    );
    assert.ok(firewallRule);
    const database = await waitForResource('azure-native:dbforpostgresql:Database', before);
    assert.strictEqual(database.databaseName, 'appdb');
  });
});
