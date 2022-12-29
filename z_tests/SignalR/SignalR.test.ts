import creator from '../../SignalR';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('SignalR Creator tests', () => {
  it('SignalR Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const { signalR, privateEndpoint } = await creator({
      name: 'aaa',
      privateLink: { subnetId: '123456' },
      group,
    });

    (signalR as any).resourceName.apply(n => expect(n).to.equal('test-stack-aaa-sigr'));
    (privateEndpoint as any).privateEndpointName.apply(n => expect(n).to.equal('test-stack-aaa-pre'));
  });
});
