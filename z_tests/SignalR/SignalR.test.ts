import creator from '../../SignalR';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('SignalR Creator tests', () => {
  it('SignalR Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const { signalR, privateEndpoint } = await creator({
      name: 'aaa',
      privateLink: { subnetId: '123456' },
      group,
    });

    const n = await outputPromise([
      (signalR as any).resourceName,
      (privateEndpoint as any).privateEndpointName,
    ]);
    expect(n[0]).to.equal('test-stack-aaa-sigr');
    expect(n[1]).to.equal('test-stack-aaa-pre');
  });
});
