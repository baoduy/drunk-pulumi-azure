import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Logs/LogAnalytics';

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
});
