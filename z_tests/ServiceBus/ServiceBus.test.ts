import creator from '../../ServiceBus';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('ServiceBus Creator tests', function () {
  this.timeout(5000);
  const group = { resourceGroupName: 'RG' };
  const vaultInfo = { id: '/12345', group, name: '123' };

  it('ServiceBus Creator', async () => {
    const rs = await creator({
      name: 'aks',
      group,
      //vaultInfo,
    });

    const n = await outputPromise((rs.resource as any).namespaceName);
    expect(n).to.equal('test-stack-aks-bus');

    expect(rs.topics).to.undefined;
    expect(rs.queues).to.undefined;
  });

  it('ServiceBus Creator with Topics', async () => {
    const rs = await creator({
      name: 'aks',
      group,
      //Not able to create Key in test mode
      //vaultInfo,

      topics: [
        {
          shortName: 'cake',
          version: 1,
          subscriptions: [
            {
              shortName: 'eat',
            },
            {
              shortName: 'eat',
              enableSession: true,
            },
          ],
        },
      ],
    });

    expect(rs.topics).to.not.undefined;

    await Promise.all(
      rs.topics!.map(async (t) => {
        //Verify the topic name
        const n = await outputPromise((t.topic as any).topicName);
        expect(n).to.equal('cake-v1-tp');

        //Verify the Subscription name
        const sn1 = await outputPromise(
          (t.subs![0].resource as any).subscriptionName
        );
        expect(sn1).to.equal('eat-cake-sub');

        const sn2 = await outputPromise(
          (t.subs![1].resource as any).subscriptionName
        );
        expect(sn2).to.equal('eat-cake-session-sub');
      })
    );
  });

  it('ServiceBus Creator with Queue', async () => {
    const rs = await creator({
      name: 'aks',
      group,
      //Not able to create Key in test mode
      //vaultInfo,

      queues: [{ shortName: 'cake', version: 1 }],
    });

    expect(rs.queues).to.not.undefined;

    await Promise.all(
      rs.queues!.map(async (t) => {
        //Verify the topic name
        const n = await outputPromise((t.queue as any).queueName);
        expect(n).to.equal('cake-v1-que');
      })
    );
  });

  it('ServiceBus Creator with VaultInfo', async () => {
    const rs = await creator({
      name: 'aks',
      group,
      vaultInfo,

      topics: [{ shortName: 'cake', version: 1 }],
      queues: [{ shortName: 'cake', version: 1 }],
    });

    expect(rs.queues).to.not.undefined;
  });
});
