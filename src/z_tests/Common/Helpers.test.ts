import '../_tools/Mocks';

import assert from 'node:assert/strict';
import * as common from '../../Common/Helpers';

describe('Helpers tests', () => {
  it('Get root domain from sub domain', () => {
    const name = common.getRootDomainFromUrl('test.drunkcoding.net');
    assert.strictEqual(name, 'drunkcoding.net');
  });

  it('Get root domain from http url', () => {
    const name = common.getRootDomainFromUrl(
      'http://test.drunkcoding.net/hello',
    );
    assert.strictEqual(name, 'drunkcoding.net');
  });

  it('Get root domain from https url', () => {
    const name = common.getRootDomainFromUrl(
      'https://test.drunkcoding.net/hello',
    );
    assert.strictEqual(name, 'drunkcoding.net');
  });

  it('Get domain from https url', () => {
    const name = common.getDomainFromUrl('https://test.drunkcoding.net/hello');
    assert.strictEqual(name, 'test.drunkcoding.net');
  });

  it('shallowEquals 2 Objects', () => {
    const rs = common.shallowEquals({ a: '123' }, { a: `123` });
    assert.strictEqual(rs, true);
  });

  it('RangeOf Test', () => {
    const rs = common.RangeOf(3);
    assert.strictEqual(rs.length, 3);
    assert.strictEqual(rs[0], 0);
  });
});
