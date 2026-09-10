import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as insights from '@pulumi/azure-native/operationalinsights';
import creator from '../../Logs/index';

// Resolves a pulumi Output's value as a real awaited Promise — see
// Storage.test.ts for why `.apply()` alone can't fail a test on a wrong value.
const resolveOutput = <T>(output: { apply: (f: (v: T) => void) => unknown }) =>
  new Promise<T>((resolve) => output.apply(resolve));

describe('Logs() wrapper tests', () => {
  it('uses the PerGB2018 default sku (30-day retention) when workspace is omitted', async () => {
    const rs = creator({
      name: 'Root',
      group: { resourceGroupName: 'RG' },
      deleteAfterDays: 30,
    });

    const retentionInDays = await resolveOutput<any>(
      (rs.logWp as any).retentionInDays,
    );
    assert.strictEqual(retentionInDays, 30);
  });

  it('passes workspace.network.privateLink through to the LogAnalytics workspace it creates', async () => {
    const rs = creator({
      name: 'Root',
      group: { resourceGroupName: 'RG' },
      deleteAfterDays: 30,
      workspace: { network: { privateLink: true } },
    });

    const ingestion = await resolveOutput<any>(
      (rs.logWp as any).publicNetworkAccessForIngestion,
    );
    assert.strictEqual(ingestion, 'Disabled');
  });

  it('passes workspace.disableLocalAuth through to the LogAnalytics workspace it creates', async () => {
    const rs = creator({
      name: 'Root',
      group: { resourceGroupName: 'RG' },
      deleteAfterDays: 30,
      workspace: { disableLocalAuth: false },
    });

    const features = await resolveOutput<any>((rs.logWp as any).features);
    assert.strictEqual(features.disableLocalAuth, false);
  });

  it('honours an explicit workspace.sku (Free -> 7-day retention)', async () => {
    const rs = creator({
      name: 'Root',
      group: { resourceGroupName: 'RG' },
      deleteAfterDays: 30,
      workspace: { sku: insights.WorkspaceSkuNameEnum.Free },
    });

    const retentionInDays = await resolveOutput<any>(
      (rs.logWp as any).retentionInDays,
    );
    assert.strictEqual(retentionInDays, 7);
  });
});
