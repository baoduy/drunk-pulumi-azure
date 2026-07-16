import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { randomPassword, randomUuId } from '../../Core/Random';

describe('Random Creator tests', () => {
  it('Random Password monthly', async () => {
    const pass = randomPassword({
      name: 'aks',
      policy: 'monthly',
    });

    assert.notStrictEqual(pass, undefined);
  });

  it('Random Password yearly', async () => {
    const pass = randomPassword({
      name: 'aks',
    });

    assert.notStrictEqual(pass, undefined);
  });

  it('Random Static Password', async () => {
    const pass = randomPassword({
      name: 'aks',
      policy: false,
    });

    assert.notStrictEqual(pass, undefined);
  });

  it('Random Uuid', async () => {
    const uid = randomUuId('aks');
    const id = await uid.result.promise();

    assert.strictEqual(id.length, 36);
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
