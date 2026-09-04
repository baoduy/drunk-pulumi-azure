import assert from 'node:assert/strict';
import creator from '../../Logs/LogAnalytics';
import { createdResources } from '../_tools/Mocks';

// Resolves a pulumi Output's value as a real awaited Promise. Using
// `.apply()` directly and asserting inside its callback does NOT fail the
// test on a wrong value: the callback runs on a microtask queued after the
// (non-awaited) async test function has already resolved, so mocha reports
// the test as passing regardless of what the assertion inside apply() finds.
const resolveOutput = <T>(output: { apply: (f: (v: T) => void) => unknown }) =>
  new Promise<T>((resolve) => output.apply(resolve));

describe('LogAnalytics Creator tests', () => {
  it('LogAnalytics Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = creator({
      name: 'Root',
      group,
    });

    const name = await (rs as any).workspaceName.promise();
    assert.strictEqual(name, 'teststack-root-sg-wp');
  });

  describe('network.privateLink (PULUMI-SEC-006)', () => {
    it('defaults public network access to Enabled when network is omitted', async () => {
      const rs = creator({ name: 'Root', group: { resourceGroupName: 'RG' } });

      const ingestion = await resolveOutput<any>(
        (rs as any).publicNetworkAccessForIngestion,
      );
      const query = await resolveOutput<any>(
        (rs as any).publicNetworkAccessForQuery,
      );
      assert.strictEqual(ingestion, 'Enabled');
      assert.strictEqual(query, 'Enabled');
    });

    it('disables both public network access properties when network.privateLink is set', async () => {
      const rs = creator({
        name: 'Root',
        group: { resourceGroupName: 'RG' },
        network: { privateLink: true },
      });

      const ingestion = await resolveOutput<any>(
        (rs as any).publicNetworkAccessForIngestion,
      );
      const query = await resolveOutput<any>(
        (rs as any).publicNetworkAccessForQuery,
      );
      assert.strictEqual(ingestion, 'Disabled');
      assert.strictEqual(query, 'Disabled');
    });
  });

  describe('features.disableLocalAuth', () => {
    it('defaults to true when omitted', async () => {
      const rs = creator({ name: 'Root', group: { resourceGroupName: 'RG' } });

      const features = await resolveOutput<any>((rs as any).features);
      assert.strictEqual(features.disableLocalAuth, true);
    });

    it('honours an explicit false (not swallowed by the `?? true` default)', async () => {
      const rs = creator({
        name: 'Root',
        group: { resourceGroupName: 'RG' },
        disableLocalAuth: false,
      });

      const features = await resolveOutput<any>((rs as any).features);
      assert.strictEqual(features.disableLocalAuth, false);
    });
  });

  describe('vaultInfo secret writes (conditional on disableLocalAuth)', () => {
    const vaultInfo = {
      id: '/s/123',
      group: { resourceGroupName: 'RG' },
      name: 'key-vault',
    };

    // Secrets are pushed from inside `log.customerId.apply(async ...)`, which
    // for the disableLocalAuth:false path also chains a real async
    // `getSharedKeys` call — poll instead of asserting synchronously, same
    // approach as Storage.test.ts's vaultInfo test.
    const findSecrets = async (watermark: number) => {
      let found: typeof createdResources = [];
      for (let i = 0; i < 50 && found.length === 0; i++) {
        found = createdResources
          .slice(watermark)
          .filter((r) => r.inputs?.contentType === 'Log Analytics');
        if (found.length === 0)
          await new Promise((resolve) => setImmediate(resolve));
      }
      return found;
    };

    it('writes only the workspace-Id secret when local auth is disabled (default) and does not call getSharedKeys', async () => {
      const watermark = createdResources.length;
      const rs = creator({
        name: 'Root',
        group: { resourceGroupName: 'RG' },
        vaultInfo,
      });

      await resolveOutput(rs.customerId);
      const secrets = await findSecrets(watermark);
      assert.strictEqual(secrets.length, 1);
      assert.ok(secrets.every((s) => !/-primary$|-secondary$/.test(s.name)));
    });

    it('writes the workspace-Id plus primary/secondary key secrets when disableLocalAuth is false', async () => {
      const watermark = createdResources.length;
      const rs = creator({
        name: 'Root',
        group: { resourceGroupName: 'RG' },
        vaultInfo,
        disableLocalAuth: false,
      });

      await resolveOutput(rs.customerId);
      const secrets = await findSecrets(watermark);
      assert.strictEqual(secrets.length, 3);
    });
  });

  it('passes importUri through as the workspace import resource option', async () => {
    const group = { resourceGroupName: 'RG' };
    const before = createdResources.length;

    const rs = creator({
      name: 'Imported',
      group,
      importUri: '/subscriptions/00000000/resourceGroups/RG/providers/Microsoft.OperationalInsights/workspaces/existing-wp',
    });
    await (rs as any).workspaceName.promise();

    const workspace = createdResources
      .slice(before)
      .find((r) => r.type.includes('operationalinsights') && r.type.includes('Workspace'));

    assert.ok(workspace, 'expected a Workspace resource to have been constructed');
    assert.strictEqual(
      workspace!.id,
      '/subscriptions/00000000/resourceGroups/RG/providers/Microsoft.OperationalInsights/workspaces/existing-wp',
    );
  });

  it('leaves the workspace import resource option unset when importUri is omitted', async () => {
    const group = { resourceGroupName: 'RG' };
    const before = createdResources.length;

    const rs = creator({
      name: 'NotImported',
      group,
    });
    await (rs as any).workspaceName.promise();

    const workspace = createdResources
      .slice(before)
      .find((r) => r.type.includes('operationalinsights') && r.type.includes('Workspace'));

    assert.ok(workspace, 'expected a Workspace resource to have been constructed');
    assert.ok(!workspace!.id, 'expected no import id when importUri is omitted');
  });

  it('stores the workspace shared keys as Key Vault secrets when vaultInfo is supplied', async () => {
    const group = { resourceGroupName: 'RG' };
    const vaultInfo = { id: '/s/123', group, name: 'key-vault' };
    const before = createdResources.length;

    const rs = creator({
      name: 'Vaulted',
      group,
      vaultInfo,
    });

    // Secrets are pushed to the vault from inside `log.customerId.apply(async ...)`,
    // which chains a real async `getSharedKeys` call — poll instead of asserting
    // synchronously after customerId resolves.
    await resolveOutput((rs as any).customerId);
    let secret;
    for (let i = 0; i < 50 && !secret; i++) {
      secret = createdResources
        .slice(before)
        .find((r) => r.inputs?.contentType === 'Log Analytics');
      if (!secret) await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(secret, 'expected a workspace key to be saved as a Key Vault secret');
  });
});
