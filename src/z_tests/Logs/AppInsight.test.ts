import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Logs/AppInsight';

describe('AppInsight Creator tests', () => {
  it('AppInsight Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = await creator({
      name: 'Dev',
      group,
    });

    const name = await (rs as any).resourceName.promise();
    assert.strictEqual(name, 'teststack-dev-sg-isg');
  });
});
