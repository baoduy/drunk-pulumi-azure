import creator from '../../ServiceBus';
import '../_tools/Mocks';
import { expect } from 'chai';

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

    (rs.resource as any).namespaceName.apply(n => expect(n).to.equal('test-stack-aks-bus'));

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
        (t.topic as any).topicName.apply(n => expect(n).to.equal('cake-v1-tp'));

        //Verify the Subscription name
        (t.subs![0].resource as any).subscriptionName.apply(sn1 => expect(sn1).to.equal('eat-cakev1-sub'));
        (t.subs![1].resource as any).subscriptionName.apply(sn2 => expect(sn2).to.equal('eat-cakev1-session-sub'));
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
        (t.queue as any).queueName.apply(n => expect(n).to.equal('cake-v1-que'));
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
