import '../_tools/Mocks';

import assert from 'node:assert/strict';
// Assumption: Common/Location's `getLocationString` no longer exists;
// `getLocation` (returns the region's display name) is the closest current
// equivalent for "resolve a location string from a possible name".
import * as location from '../../Common/Location';

describe('Common/Location tests', () => {
  it('Get location', () => {
    const locations = location.getLocation('Southeast Asia');
    assert.ok(locations.length > 10);
  });

  it('Get Public IP', async () => {
    const locations = await location.getMyPublicIpAddress();
    assert.notStrictEqual(locations, undefined);
  });
});
