import '../_tools/Mocks';

import creator from '../../Logs/AppInsight';
import { expect } from 'chai';

describe('AppInsight Creator tests', () => {
  it('AppInsight Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = await creator({
      name: 'Dev',
      group,
    });

    (rs as any).resourceName.apply(n => expect(n).to.equal('test-stack-dev-isg'));
  });
});
