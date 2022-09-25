import creator from '../../Logs/LogAnalytics';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('LogAnalytics Creator tests', () => {
  it('LogAnalytics Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = creator({
      name: 'Root',
      group,
    });

    const n = await outputPromise((rs.log as any).workspaceName);
    expect(n).to.equal('test-stack-root-log');
  });
});
