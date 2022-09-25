import '../_tools/Mocks';

import creator from '../../Logs/AppInsight';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('AppInsight Creator tests', () => {
  it('AppInsight Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = await creator({
      name: 'Dev',
      group,
    });

    const n = await outputPromise((rs as any).resourceName);
    expect(n).to.equal('test-stack-dev-isg');
  });
});
