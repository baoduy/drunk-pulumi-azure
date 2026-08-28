import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as pulumi from '@pulumi/pulumi';
import creator, { VaultBuilderResults } from '../../Builder/VaultBuilder';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

const waitForVault = (before: number) =>
  waitForResource('azure-native:keyvault:Vault', before);

const resolveOutput = <T>(output: { apply: (f: (v: T) => void) => unknown }) =>
  new Promise<T>((resolve) => output.apply(resolve));

describe('VaultBuilder network passthrough tests', () => {
  it('publicNetworkAccess is Disabled when network.privateLink is configured', async () => {
    const before = createdResources.length;

    creator({
      name: 'root',
      group: { resourceGroupName: 'RG' },
      network: { privateLink: { subnetIds: ['/subnet/1'] } },
    }).build();

    const inputs = await waitForVault(before);
    assert.strictEqual(inputs.properties.publicNetworkAccess, 'Disabled');
  });

  it('publicNetworkAccess is Enabled when no network is configured', async () => {
    const before = createdResources.length;

    creator({
      name: 'root',
      group: { resourceGroupName: 'RG' },
    }).build();

    const inputs = await waitForVault(before);
    assert.strictEqual(inputs.properties.publicNetworkAccess, 'Enabled');
  });
});

describe('VaultBuilderResults', () => {
  it('build() exposes name/group/id/info sourced from the created vault', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = creator({ name: 'root', group }).build();

    assert.strictEqual(rs.group, group);
    assert.strictEqual(rs.info().group, group);
    assert.strictEqual(rs.name, rs.info().name);

    const urn = await resolveOutput(rs.id as any);
    assert.ok(urn.includes('resourceGroups'));
  });

  it('VaultBuilderResults.from throws when vaultInfo is missing name or id', () => {
    assert.throws(() =>
      VaultBuilderResults.from({ name: '', id: undefined, group: {} } as any),
    );
  });

  it('addSecrets stores a project secret by key', async () => {
    pulumi.runtime.setConfig('testProject:vaultBuilderSecret', 'shh');
    const before = createdResources.length;
    const rs = creator({ name: 'root', group: { resourceGroupName: 'RG' } }).build();

    rs.addSecrets('vaultBuilderSecret');

    const contentType = `${rs.name}-vaultBuilderSecret`;
    let secret;
    for (let i = 0; i < 50 && !secret; i++) {
      secret = createdResources
        .slice(before)
        .find((r) => r.inputs?.contentType === contentType);
      if (!secret) await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(secret, 'expected the secret to be added to the vault');
  });

  it('addSecretsIf only adds secrets when condition is true', async () => {
    const before = createdResources.length;
    const rs = creator({ name: 'root', group: { resourceGroupName: 'RG' } }).build();

    rs.addSecretsIf(false, { skipped: 'value' });
    rs.addSecretsIf(true, { 'derived-secret': (info: any) => info.name });

    const skippedContentType = `${rs.name}-skipped`;
    const derivedContentType = `${rs.name}-derived-secret`;
    let secret;
    for (let i = 0; i < 50 && !secret; i++) {
      secret = createdResources
        .slice(before)
        .find((r) => r.inputs?.contentType === derivedContentType);
      if (!secret) await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(secret, 'expected the conditional secret to be added');
    assert.ok(
      !createdResources
        .slice(before)
        .some((r) => r.inputs?.contentType === skippedContentType),
      'expected the false-condition secret to be skipped',
    );
  });

  it('privateLinkToIf only creates the private link when condition is true', async () => {
    const before = createdResources.length;
    const rs = creator({ name: 'root', group: { resourceGroupName: 'RG' } }).build();

    rs.privateLinkToIf(false, { subnetIds: ['/subnet/skip'] });
    rs.privateLinkToIf(true, { subnetIds: ['/subnet/1'] });

    let endpoint;
    for (let i = 0; i < 50 && !endpoint; i++) {
      endpoint = createdResources
        .slice(before)
        .find((r) => r.type === 'azure-native:network:PrivateEndpoint');
      if (!endpoint) await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(endpoint, 'expected privateLinkToIf(true, ...) to create a private endpoint');
  });
});
