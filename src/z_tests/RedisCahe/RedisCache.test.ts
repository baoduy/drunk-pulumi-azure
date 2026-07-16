import '../_tools/Mocks';

import assert from 'node:assert/strict';
// RedisCache moved into the Builder pattern; creator(...).withSku(...).build() replaces the old direct call.
import creator from '../../Builder/RedisCacheBuilder';

describe('RedisCache Creator tests', () => {
  it('Redis Cache Creator', async () => {
    const group = { resourceGroupName: 'RG' };
    const rs = creator({
      name: 'cache',
      group,
    })
      .withSku({ name: 'Basic', family: 'C', capacity: 0 })
      .build();

    assert.strictEqual(rs.name, 'teststack-cache-sg-rds');
  });
});
