import '../_tools/Mocks';

import assert from 'node:assert/strict';
import creator from '../../Builder/AcrBuilder';
import { naming } from '../../Common';

describe('AcrBuilder Creator tests', () => {
  it('AcrBuilder Creator', async () => {
    const group = { resourceGroupName: 'RG' };

    const rs = creator({
      name: 'drunkcoding',
      group,
    })
      .withSku('Basic')
      .build();

    assert.strictEqual(rs.name, naming.getAcrName('drunkcoding'));
    assert.strictEqual(rs.group.resourceGroupName, 'RG');
  });
});
