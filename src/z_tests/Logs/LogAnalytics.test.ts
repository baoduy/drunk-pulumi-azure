import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Logs/LogAnalytics';
import { createdResources } from '../_tools/Mocks';

// Resolves a pulumi Output's value as a real awaited Promise — see
// Storage.test.ts for why `.apply()` alone can't fail a test on a wrong value.
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
});
