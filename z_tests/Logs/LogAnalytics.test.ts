import creator from '../../Logs/LogAnalytics';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('LogAnalytics Creator tests', () => {
  it('LogAnalytics Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = creator({
      name: 'Root',
      group,
    });

    (rs.log as any).workspaceName.apply(n => expect(n).to.equal('test-stack-root-log'));
  });
});
