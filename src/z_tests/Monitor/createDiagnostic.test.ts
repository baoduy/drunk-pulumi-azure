import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { createDiagnostic } from '../../Monitor';
import { createdResources } from '../_tools/Mocks';
import { waitForResource } from '../_tools/waitForResource';

const DIAGNOSTIC_SETTING_TYPE = 'azure-native:monitor:DiagnosticSetting';

describe('createDiagnostic tests', () => {
  it('logs produce a LogSettings entry with the categoryGroup enabled', async () => {
    const rs = createDiagnostic('diag-logs', {
      resourceUri: '/subscriptions/1/resourceGroups/rg/providers/thing',
      logs: [{ categoryGroup: 'audit' }],
    });

    const logs = await rs.logs.promise();
    assert.deepStrictEqual(logs, [{ categoryGroup: 'audit', enabled: true }]);
  });

  it('metrics produce a MetricSettings entry with the category enabled', async () => {
    const rs = createDiagnostic('diag-metrics', {
      resourceUri: '/subscriptions/1/resourceGroups/rg/providers/thing',
      metrics: [{ category: 'AllMetrics' }],
    });

    const metrics = await rs.metrics.promise();
    assert.deepStrictEqual(metrics, [{ category: 'AllMetrics', enabled: true }]);
  });

  it('wires resourceUri and workspaceId through to the resource', async () => {
    const rs = createDiagnostic('diag-wiring', {
      resourceUri: '/subscriptions/1/resourceGroups/rg/providers/thing',
      workspaceId: '/subscriptions/1/resourceGroups/rg/providers/workspace',
    });

    const [resourceUri, workspaceId] = await Promise.all([
      rs.resourceUri.promise(),
      rs.workspaceId.promise(),
    ]);
    assert.strictEqual(
      resourceUri,
      '/subscriptions/1/resourceGroups/rg/providers/thing'
    );
    assert.strictEqual(
      workspaceId,
      '/subscriptions/1/resourceGroups/rg/providers/workspace'
    );
  });

  it('does not emit retentionPolicy (Azure retired legacy diagnostic-setting retention)', async () => {
    const before = createdResources.length;
    createDiagnostic('diag-no-retention', {
      resourceUri: '/subscriptions/1/resourceGroups/rg/providers/thing',
      logs: [{ categoryGroup: 'audit' }],
    });

    const inputs = await waitForResource(DIAGNOSTIC_SETTING_TYPE, before);
    assert.strictEqual(inputs.retentionPolicy, undefined);
  });
});
