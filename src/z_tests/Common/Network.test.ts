import '../_tools/Mocks';

import assert from 'node:assert/strict';
import { getNetworkDefaultAction } from '../../Common/Network';

describe('getNetworkDefaultAction tests', () => {
  it('defaults to Deny when rules are present (R3 security fix)', () => {
    assert.strictEqual(getNetworkDefaultAction(true), 'Deny');
  });

  it('defaults to Allow when no rules are present (R3 regression guard)', () => {
    assert.strictEqual(getNetworkDefaultAction(false), 'Allow');
  });

  it('an explicit defaultAction always wins over hasRules=true', () => {
    assert.strictEqual(getNetworkDefaultAction(true, 'Allow'), 'Allow');
  });

  it('an explicit defaultAction always wins over hasRules=false', () => {
    assert.strictEqual(getNetworkDefaultAction(false, 'Deny'), 'Deny');
  });
});
