import { createdResources } from '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Logs/LogAnalytics';

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
