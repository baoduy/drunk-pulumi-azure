import creator from '../../RedisCache';
import '../_tools/Mocks';
import { expect } from 'chai';
import { outputPromise } from '../../Common/Helpers';

describe('RedisCache Creator tests', () => {
  it('Redis Cache Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = await creator({
      name: 'cache',
      group,
    });

    const n = await outputPromise(rs.name);
    expect(n).to.equal('test-stack-cache-rds');
  });
});
