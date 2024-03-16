import * as location from '../../Common/Location';
import { expect } from 'chai';

describe('Common/Location tests', () => {
  it('Get location', () => {
    const locations = location.getLocationString('Southeast Asia');
    expect(locations).to.have.length.above(10);
  });

  it('Get Public IP', async () => {
    const locations = await location.getMyPublicIpAddress();
    expect(locations).not.undefined;
  });
});
