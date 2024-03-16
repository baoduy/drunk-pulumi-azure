import creator from '../../RedisCache';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('RedisCache Creator tests', () => {
  it('Redis Cache Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = await creator({
      name: 'cache',
      group,
    });

    rs.name.apply(n => expect(n).to.equal('test-stack-cache-rds'));
  });
});
