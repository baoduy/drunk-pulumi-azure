import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as native from '@pulumi/azure-native';
// DefaultResourceArgs (../../types) no longer exists; ResourceCreator now
// exports its own props type, DefaultCreatorProps, which is the type its
// second argument is actually constrained to.
import rsCreator, { DefaultCreatorProps } from '../../Core/ResourceCreator';

describe('Resource Creator tests. The resource creator will not reformat the name', () => {
  it('Resource Creator', async () => {
    const rs = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
    } as native.resources.ResourceGroupArgs & DefaultCreatorProps);

    const urn = await rs.resource.urn.promise();
    assert.ok(urn.includes('resource-group'));
  });

  it('Resource Creator with lock', async () => {
    const { locker } = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
      lock: true,
    } as native.resources.ResourceGroupArgs & DefaultCreatorProps);

    assert.notStrictEqual(locker, undefined);

    const name = await locker!.name.promise();
    assert.strictEqual(name, 'resource-group-CanNotDelete');
  });

  it('Resource Creator with monitoring creates a DiagnosticSetting wired to the resource', async () => {
    const { diagnostic } = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
      monitoring: {
        logWpId: '/subscriptions/1/resourceGroups/rg/providers/workspace',
        logsCategories: ['audit'],
        metricsCategories: ['AllMetrics'],
      },
    } as native.resources.ResourceGroupArgs & DefaultCreatorProps);

    assert.notStrictEqual(diagnostic, undefined);

    const [name, logs, metrics, workspaceId] = await Promise.all([
      diagnostic!.name.promise(),
      diagnostic!.logs.promise(),
      diagnostic!.metrics.promise(),
      diagnostic!.workspaceId.promise(),
    ]);
    assert.strictEqual(name, 'resource-group-diag');
    assert.deepStrictEqual(logs, [{ categoryGroup: 'audit', enabled: true }]);
    assert.deepStrictEqual(metrics, [
      { category: 'AllMetrics', enabled: true },
    ]);
    assert.strictEqual(
      workspaceId,
      '/subscriptions/1/resourceGroups/rg/providers/workspace'
    );
  });

  it('Resource Creator without monitoring leaves diagnostic undefined', async () => {
    const { diagnostic } = await rsCreator(native.resources.ResourceGroup, {
      resourceGroupName: 'resource-group',
    } as native.resources.ResourceGroupArgs & DefaultCreatorProps);

    assert.strictEqual(diagnostic, undefined);
  });

  it('non-resource-group class falls back to resourceName', async () => {
    const rs = await rsCreator(native.network.PublicIPAddress, {
      resourceGroupName: 'rg',
      resourceName: 'my-ip',
    } as native.network.PublicIPAddressArgs & DefaultCreatorProps);

    const urn = await rs.resource.urn.promise();
    assert.ok(urn.includes('my-ip'));
  });

  it('non-resource-group class falls back to a *Name key when name/resourceName are absent', async () => {
    const rs = await rsCreator(native.network.PublicIPAddress, {
      resourceGroupName: 'rg',
      publicIpAddressName: 'my-ip-2',
    } as unknown as native.network.PublicIPAddressArgs & DefaultCreatorProps);

    const urn = await rs.resource.urn.promise();
    assert.ok(urn.includes('my-ip-2'));
  });

  it('throws when no name can be found in props', () => {
    assert.throws(
      () =>
        rsCreator(native.network.PublicIPAddress, {
          location: 'eastus',
        } as unknown as native.network.PublicIPAddressArgs &
          DefaultCreatorProps),
      /Name is not able to find in/
    );
  });
});
